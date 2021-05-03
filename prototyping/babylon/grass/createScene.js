// From a concept originally explored at https://cyos.babylonjs.com/#V9BY6Z#27
// by syntheticmagus

const VERTEX_SHADER_CODE = `
precision highp float;

// Attributes
attribute vec3 position;
attribute vec3 normal;
attribute vec2 uv;

// Uniforms
uniform mat4 worldViewProjection;

// Varying
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUV;

void main(void) {
    vec4 outPosition = worldViewProjection * vec4(position, 1.0);
    gl_Position = outPosition;
    
    vUV = uv;
    vPosition = position;
    vNormal = normal;
}
`;

const FRAGMENT_SHADER_CODE = `
precision highp float;

// As of version 23, a weird artifact is visible which appears to cause
// banding and clipping in the display and is affected by rotation. I
// believe it has something to do with the artifacting at high density,
// but more investigation is needed. I think whatever this behavior is
// was probably already present in version 22, but until I know for sure 
// I want to record a sort of LKG that I can revisit if needed.

// Ah, here's one issue: the surfaces are self-occluding and, based on 
// that, deciding they don't have any hits. I need to assess both 
// surface hits, not one or the other and draw whichever has a valid
// uv (or possibly both).

// Varying
varying vec3 vPosition;
varying vec3 vNormal;
varying vec2 vUV;

// Uniforms
uniform mat4 world;
uniform float time;

// Refs
uniform vec3 cameraPosition;
uniform sampler2D textureSampler;


// float round(float val) {
//     return float(int(val + sign(val) * 0.5));
// }

float getLinePlaneIntersectionDistance(vec3 lineOrigin, vec3 lineDirection, vec3 planeOrigin, vec3 planeNormal) {
    return dot(planeOrigin - lineOrigin, planeNormal) / dot(lineDirection, planeNormal); 
}

#define ORIGINS_DENSITY 4.
#define BLADE_ORIGINS_COUNT 24 // NOTE: This must be divisible by three!
vec3[BLADE_ORIGINS_COUNT] getBladeOrigins(vec3 origin, vec3 direction) {
    vec3[BLADE_ORIGINS_COUNT] bladeOrigins;
    float scale = 1. / ORIGINS_DENSITY;
    
    // To find the origins, we intersect with the planes in the axis-aligned direction
    // most similar to our view direction, then find the candidate origins closest to 
    // where we intercept those planes.
    vec3 lo = vec3(origin.x, 0., origin.z) / scale;
    vec3 ld = normalize(vec3(direction.x, 0., direction.z));
    vec3 pd = vec3(round(ld.x), 0., sign(ld.z) * (1. - abs(round(ld.x))));
    vec3 po = lo + 0.5 * pd;
    po = vec3(round(po.x), 0., round(po.z));
    vec3 ps = pd.zyx * scale;
    vec3 pt;
    for (int idx = 0; idx < bladeOrigins.length(); idx += 3) {
        pt = lo + getLinePlaneIntersectionDistance(lo, ld, po, pd) * ld;
        // TODO: This ordering is WRONG! This cannot be done blindly. These must be added in order
        // of increasing distance from the viewpoint lest surfaces will be rendered on top of 
        // nearer ones. This becomes even more complicated if surfaces can clip through each
        // other, which is anticipated. But for the simple case, ps should point in a specific 
        // direction relative to the view direction -- dot product of view dir and ps should be 
        // negative -- and the order of the origins should be -, 0, +.
        bladeOrigins[idx] = vec3(round(pt.x), 0., round(pt.z)) * scale;
        bladeOrigins[idx + 1] = bladeOrigins[idx] + ps;
        bladeOrigins[idx + 2] = bladeOrigins[idx] - ps;
        po += pd;
    }
    
    return bladeOrigins;
}

// "Surface" is kind of non-specific, so this will take a little explaining.
// The specific surface we're interested in here is defined by the following 
// equation:
// 
//      z = u (x + t y)^2 + v y^2
// 
// The parameters used to control the equation are as follows:
// 
//      t: skew in x
//      u: curvature in x
//      v: curvature in y
// 
// I apologize for the names of the variables, but when trying to combine
// code with arithmetic, it is difficult to align conventions and maintain
// clarity/readability, so I went for notation that would most closely 
// match the math scratch on the assumption that any attempt to understand
// this would require reference to math scratch anyway, which will be 
// facilitated by math-y notation. Anyway, the three terms above are provided
// as a means of warping the surface for animation purposes.
// 
// This function, then, provides a closed-form solution for intersecting a 
// line with this surface. By starting with a line in the form
// 
//     p = o + k d
// 
// and splitting this into the system of equations
// 
//     x = o_x + k d_x
//     y = o_y + k d_y
//     z = o_z + k d_z
// 
// we are then able to subsitute these definitions into the original surface
// equation to acquire an equation in k.
// 
//     z + k c = u (x + k a + t (y + k b))^2 + v (y + k b)^2
// 
// Note the notation change: o becomes (x, y, z) and d becomes (a, b, c). This
// was done to try to make the math scratch both readable and translatable into
// source code, where I can't use subscripts or Greek letters. Again, I apologize
// for this notation, but this seemed like the least of the available evils.
// 
// From this point, the derivation to what is described below is a reasonably
// straightforward reframing to get everything on one side and isolate the k
// variables, at which point the quadratic formula can be used. It is important
// to realize, however, that this solution contains two singularities, one when
// both curvature terms are 0 and the other when both a and b are 0. In other 
// words, this solution fails both when the surface is a plane and when the
// surface is viewed dead-on. In practice, only the first of these singularities 
// can ever really occur, and it can be easily avoided by simply never setting
// the curvature terms below some minimum threshold -- 0.01. Note that when
// the curvature terms are near zero, some parts of the surface may manifest 
// the singularity when others do not, but this has never been observed in a 
// curvature above 0.01.
// 
// Also note that two distances are returned. This is because the quadratic 
// formula by nature yields two results, and we cannot deduce at this point
// which of these two answers is the desired one. All lines which intersect 
// the surface will do so twice except for tangent lines and lines parallel 
// to the z axis. (This latter fact is also the reason for the singularities: 
// the quadratic formula cannot provide two valid solutions if a line 
// intersects the surface only once.) Depending on where the surface is being
// viewed from, the one of these intersection points may occlude the other, 
// one may be behind the observer. This is relatively easy to deduce -- the
// observer almost certainly wants the smallest nonnegative result available --
// but doing so is not the job of this function, which encapsulates pure math,
// not logic. It is the caller's job to handle the fact that this function 
// returns two answers, both of which can be positive, negative, zero, or NaN.
vec2 getLineIntersectDistancesWithSurface(vec3 lineOrigin, vec3 lineDirection, float xCurve, float yCurve, float xSkew) {
    float x = lineOrigin.x;
    float y = lineOrigin.y;
    float z = lineOrigin.z;
    float a = lineDirection.x;
    float b = lineDirection.y;
    float c = lineDirection.z;
    float t = xSkew;
    float u = xCurve;
    float v = yCurve;
    // Mom always told me I'd need the quadratic formula someday.
    float term1 = u * pow(a + t * b, 2.) + v * pow(b, 2.);
    float term2 = 2. * (u * (a + t * b) * (x + t * y) + v * b * y) - c;
    float term3 = u * pow(x + t * y, 2.) + v * pow(y, 2.) - z;
    float sqrtTerm = sqrt(pow(term2, 2.) - 4. * term1 * term3);
    vec2 solutions = vec2(
        (-term2 - sqrtTerm) / (2. * term1),
        (-term2 + sqrtTerm) / (2. * term1));
    return isnan(solutions.x * solutions.y) ? vec2(10000., 10000.) : solutions;
}

// The first three values of the return are the position. The fourth value is the distance used, or
// a negative value (-1) if no valid hits were discovered.
vec4 getLineSurfaceIntersection(vec3 lineOrigin, vec3 lineDirection, float xCurve, float yCurve, float xSkew) {
    vec2 dists = getLineIntersectDistancesWithSurface(lineOrigin, lineDirection, xCurve, yCurve, xSkew);
    // TODO: If this is branching, figure out how to do it without branching.
    float dist = isnan(dists.x) || isnan(dists.y) ? -1. : dists.x >= 0. ? dists.x : dists.y >= 0. ? dists.y : -1.;
    return vec4(lineOrigin + lineDirection * dist, dist);
}


vec3 getNormalFromSurfacePoint(vec3 surfacePoint, float xCurve, float yCurve, float xSkew) {
    return normalize(vec3(-2. * xCurve * (surfacePoint.x + xSkew * surfacePoint.y), -2. * yCurve * surfacePoint.y, 1.));
}

vec2 getUvFromSurfacePoint(vec3 surfacePoint, float xCurve, float yCurve, float xSkew) {
    float x = sqrt(1. + xCurve) * (surfacePoint.x + xSkew * surfacePoint.y);
    float y = sqrt(1. + yCurve) * surfacePoint.y;
    return vec2(x + 0.5, y);
}

// TODO: This should eventually just sample a texture. For now, just hack it.
vec4 getAlbedo(vec2 uv) {
    return texture2D(textureSampler, uv);
    /*float x = uv.x - 0.5;
    float y = -100. * pow(x, 2.) + 1.;
    float stroke = 0.04;
    return vec4((1. - step(y, uv.y + stroke)) * vec3(0., 0.4, 0.1), (1. - step(y, uv.y - stroke)) * 1.);*/
}

// ********** BEGIN PURE TEST FUNCTIONS **********

// Contract: first return is the effective world matrix, the second is its inverse.
// TODO: Replace this with a real way to get the matrices.
mat4[2] getTestMatrices(vec3 origin) {
    mat4[2] mats;
    mats[0][0][0] = 1.;
    mats[0][1][1] = 1.;
    mats[0][2][2] = 1.;
    mats[0][3][3] = 1.;
    
    // Set Y for testing purposes.
    //mats[0][3][1] = 1.5;
    
    // Set Y rotation for testing purposes.
    float theta = 173.28385 * (origin.x + origin.z) * 3.14159 / 2.;
    mats[0][0][0] = cos(theta);
    mats[0][2][0] = -sin(theta);
    mats[0][0][2] = sin(theta);
    mats[0][2][2] = cos(theta);
    
    mats[1] = inverse(mats[0]);
    
    return mats;
}

vec4 originsTestCode(vec3 pos, vec3 dir) {
    vec3[BLADE_ORIGINS_COUNT] bladeOrigins = getBladeOrigins(pos, dir);
    
    vec4 color = vec4(0., 0., 0., 0.);
    for (int idx = bladeOrigins.length() - 1; idx >= 0; --idx) {
        // Test code
        float d = getLinePlaneIntersectionDistance(pos, dir, bladeOrigins[idx], -dir);
        vec3 pt = pos + d * dir;
        if (d > 0. && distance(pt, bladeOrigins[idx]) < 0.1) {
            color += vec4(0.1, 0.1, 0.1, 0.);
            color.w = 1.;
        }
        
        // TODO
        // Get the surface associated with this origin.
        // Get the position, normal, and uv for the intersection.
        // Sample the texture.
        // Compute the new color.
        // Combine the new color into gl_FragColor.
        // Profit!
    }
    
    return color;
}

vec4 surfaceTestCode(vec3 pos, vec3 dir) {
    vec4 color = vec4(0., 0., 0., 0.);
    
    float xCurve = 1.;
    float yCurve = 0.1;
    float xSkew = 0.2;
    vec2 foo = getLineIntersectDistancesWithSurface(pos, dir, xCurve, yCurve, xSkew);
    
    // step(0., NaN) returns 0.
    // TODO: Figure out how to do all this without branching.
    if (isnan(foo.x)) {
        // Red: Not observing the surface.
        color.x = 1.;
    }
    else if (foo.x > 0. && foo.x < 10.) {
        // Green: Observing the front of the surface.
        color.y = 1.;
    }
    else if (foo.y > 0. && foo.y < 10.) {
        // Blue: Observing the back of the surface.
        color.z = 1.;
    }
    else if (foo.x < 0. && foo.y < 0.) {
        // White: Intersections available, but behind us.
        color.x = 1.;
        color.y = 1.;
        color.z = 1.;
    } else {
        // Black: intersections available, but out of range.
    }
    color.w = 1.;
    
    vec4 point = getLineSurfaceIntersection(pos, dir, xCurve, yCurve, xSkew);
    vec2 uv = getUvFromSurfacePoint(point.xyz, xCurve, yCurve, xSkew);
    if (point.w >= 0. && uv.x > 0. && uv.x < 1. && uv.y > 0. && uv.y < 1.) {
        color = getAlbedo(uv);
    }
    
    return color;
}

vec4 grassesTestCode(vec3 pos, vec3 dir) {
    vec3[BLADE_ORIGINS_COUNT] bladeOrigins = getBladeOrigins(pos, dir);
    
    vec4 color = vec4(0., 0., 0., 0.);
    float depth = 100000.;
    for (int idx = bladeOrigins.length() - 1; idx >= 0; --idx) {
        vec3 offsetPos = pos - bladeOrigins[idx];
        // offsetPos is now in this origin's world space. Use a transform
        // matrix to get it into the origin's object space, which for now 
        // we assume is identity.
        mat4[2] mats = getTestMatrices(bladeOrigins[idx]);
        vec3 localPos = (mats[1] * vec4(offsetPos, 1.)).xyz;
        vec3 localDir = (mats[1] * vec4(dir, 0.)).xyz;
        
        float xCurve = 0.01;
        float yCurve = 0.11 + 0.1 * cos(time + 17.2742 * (bladeOrigins[idx].x + bladeOrigins[idx].y));
        float xSkew = 0.1 * cos(time + 17.2742 * (bladeOrigins[idx].x + bladeOrigins[idx].y));
        
        // TODO: So...everything below here's going to need some optimization, probably...
        vec2 dists = getLineIntersectDistancesWithSurface(localPos, localDir, xCurve, yCurve, xSkew);

        // This VERY CLEARLY never happens. And yet the possibility that it COULD happen somehow changes
        // the behavior of the algorithm.
        //bool definitelyNot = dists.x == 0. && dists.x != 0.;
        //if (definitelyNot) {
        //    return vec4(1., 0., 0., 1.);
        //}
        
        vec4[2] points;
        points[0] = vec4(localPos + localDir * dists.x, dists.x);
        points[1] = vec4(localPos + localDir * dists.y, dists.y);
        for (int innerIdx = 0; innerIdx < 2; ++innerIdx) {
            vec4 point = points[innerIdx];
            vec2 uv = getUvFromSurfacePoint(point.xyz, xCurve, yCurve, xSkew);
            vec4 albedo = vec4(0., 0., 0., 0.);
            // TODO: Don't branch. This seems to have a MUCH smaller perf impact than the NaN check above
            if (point.w >= 0. && point.w < depth && uv.x > 0. && uv.x < 1. && uv.y > 0. && uv.y < 1.) {
                albedo = getAlbedo(uv);
                float alpha = albedo.w;
                albedo *= min(1., 0.3 + 2. *abs(dot(vec3(0., 1., 0.), getNormalFromSurfacePoint(point.xyz, xCurve, yCurve, xSkew))));
                albedo.w = alpha;

                // TODO: Compute the new color correctly. I have no idea what I'm doing.
                // TODO: Fallback to deal with depth problems?
                // TODO: Transform the position and normal back out into world space for lighting.
                color = vec4(mix(color.xyz, albedo.xyz, albedo.w), min(color.w + albedo.w, 1.));
                depth = albedo.w > 0.5 ? point.w : depth;
            }
        }
    }
    
    return color;
}

// ********** END PURE TEST FUNCTIONS **********

void main(void) {
    // World values
    vec3 vPositionW = vec3(world * vec4(vPosition, 1.));
    vec3 vNormalW = normalize(vec3(world * vec4(vNormal, 0.)));
    vec3 viewDirectionW = normalize(cameraPosition - vPositionW);
    
    vec3 dir = normalize(vPositionW - cameraPosition);
    vec3 pos = vPositionW;
    
    //gl_FragColor = originsTestCode(pos, dir);
    //gl_FragColor = surfaceTestCode(pos, dir);
    gl_FragColor = grassesTestCode(pos, dir);

    // TODO: This hack is working around a very strange 1 pixel wide artifact 
    // that shows up as soon as we use a real texture. Figure out what's happening
    // with this.
    gl_FragColor.w = step(0.7, gl_FragColor.w);
}
`;

var time = 0;
var createScene = function (engine, canvas) {
    var scene = new BABYLON.Scene(engine);

    var camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 5, 0), scene);
    camera.attachControl(canvas, true);
    camera.setTarget(new BABYLON.Vector3(10,0.5,4));
    camera.minZ = 0.1;
    camera.speed = 0.1;
    
    var light = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.7;

    var box = BABYLON.MeshBuilder.CreateBox("box", {size:2}, scene);
    box.position.y = 0.3;
    box.scaling.y = 0.4;
    box.scaling.x = 100;
    box.scaling.z = 100;

    BABYLON.Effect.ShadersStore["customVertexShader"] = VERTEX_SHADER_CODE;
    BABYLON.Effect.ShadersStore["customFragmentShader"] = FRAGMENT_SHADER_CODE;

    var shaderMaterial = new BABYLON.ShaderMaterial("shader", scene, {
        vertex: "custom",
        fragment: "custom",
	    },
        {
			attributes: ["position", "normal", "uv"],
			uniforms: ["world", "worldView", "worldViewProjection", "view", "projection", "cameraPosition", "time"]
        });
    shaderMaterial.setVector3("cameraPosition", scene.activeCamera.position);
    shaderMaterial.transparencyMode = 2;
    shaderMaterial.alpha = 0;
    box.material = shaderMaterial;

    let frameCount = 0;
    scene.onBeforeRenderObservable.add(() => {
        frameCount += 1;
        shaderMaterial.setFloat("time", frameCount * 0.016);
    });

    const texture = new BABYLON.Texture("./grass.png", scene, true);
    texture.wrapU = 0;
    texture.wrapV = 0;
    shaderMaterial.setTexture("textureSampler", texture);

    var ground = BABYLON.MeshBuilder.CreateGround("ground", {width: box.scaling.x * 2, height: box.scaling.z * 2}, scene);
    var groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.1, 0.2, 0.1);
    groundMat.specularColor = BABYLON.Color3.Black();
    ground.material = groundMat;

    // BABYLON.MeshBuilder.CreateBox("", {size: 2}, scene);
    //scene.debugLayer.show();

    return scene;
};
