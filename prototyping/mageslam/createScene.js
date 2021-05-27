var createScene = async function (engine, canvas) {
    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // This creates and positions a free camera (non-mesh)
    var camera = new BABYLON.ArcRotateCamera("arcR", -Math.PI/2, Math.PI/2, 15, BABYLON.Vector3.Zero(), scene);

    // This attaches the camera to the canvas
    camera.attachControl(canvas, true);

	var planeOpts = {
			height: 5.4762, 
			width: 7.3967, 
			sideOrientation: BABYLON.Mesh.DOUBLESIDE
	};
	var ANote0Video = BABYLON.MeshBuilder.CreatePlane("plane", planeOpts, scene);
	var vidPos = (new BABYLON.Vector3(0,0,0.1))
    ANote0Video.position = vidPos;

    BABYLON.Tools.DelayAsync(5000).then(async function() {
        var ANote0VideoMat = new BABYLON.StandardMaterial("m", scene);
        var ANote0VideoVidTex = new BABYLON.VideoTexture("vidtex","bananas.mp4", scene);
        ANote0VideoVidTex.video.playbackRate = 0.25;
        ANote0VideoVidTex.video.loop = false;
        ANote0VideoMat.diffuseTexture = ANote0VideoVidTex;
        ANote0VideoMat.roughness = 1;
        ANote0VideoMat.emissiveColor = new BABYLON.Color3.White();
        ANote0Video.material = ANote0VideoMat;
        scene.onPointerObservable.add(function(evt){
                if(evt.pickInfo.pickedMesh === ANote0Video){
                    //console.log("picked");
                        if(ANote0VideoVidTex.video.paused)
                            ANote0VideoVidTex.video.play();
                        else
                            ANote0VideoVidTex.video.pause();
                        console.log(ANote0VideoVidTex.video.paused?"paused":"playing");
                }
        }, BABYLON.PointerEventTypes.POINTERPICK);

        const slam = await Microsoft.MageSlam.CreateAsync(ANote0VideoVidTex);
        await BABYLON.Tools.DelayAsync(1000);
        slam.startTracking();
    });

    //console.log(ANote0Video);
    return scene;
};
