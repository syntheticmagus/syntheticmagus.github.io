var createScene = async function (engine, canvas) {
    // This creates a basic Babylon Scene object (non-mesh)
    var scene = new BABYLON.Scene(engine);

    // This creates and positions a free camera (non-mesh)
    var camera = new BABYLON.ArcRotateCamera("arcR", -Math.PI/2, Math.PI/2, 15, BABYLON.Vector3.Zero(), scene);
    
    var advancedTexture = BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    var rect1 = new BABYLON.GUI.Rectangle();
    rect1.width = "80px";
    rect1.height = "40px";
    rect1.cornerRadius = 20;
    rect1.color = "white";
    rect1.thickness = 4;
    rect1.background = "white";
    rect1.horizontalAlignment = BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    rect1.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    advancedTexture.addControl(rect1);

    const txt = new BABYLON.GUI.TextBlock("fpsText", "0 FPS");
    rect1.addControl(txt);

    const createVideoTexture = async function() {
        //canvas.requestFullscreen();

        var ANote0VideoVidTex = await BABYLON.VideoTexture.CreateFromWebCamAsync(scene, {facingMode: "environment"});
        ANote0VideoVidTex.vScale = -1;
        
        var layer = new BABYLON.Layer('', undefined, scene, true);
        layer.texture = ANote0VideoVidTex;
        
        const slam = await Microsoft.MageSlam.CreateAsync(ANote0VideoVidTex);
        let prior = Date.now();
        let interval = 0;
        slam.onTrackingUpdatedObservable.add((tracked) => {
            if (tracked) {
                rect1.background = "green";
            } else {
                rect1.background = "red";
            }

            const now = Date.now();
            interval = 0.9 * interval + 0.1 * Math.round(1000 / (now - prior));
            prior = now;

            txt.text = Math.round(interval) + " FPS";
        });
        await BABYLON.Tools.DelayAsync(1000);
        slam.startTracking();
    };

    var button1 = BABYLON.GUI.Button.CreateSimpleButton("but1", "Click Me");
    button1.width = "150px"
    button1.height = "40px";
    button1.color = "white";
    button1.cornerRadius = 20;
    button1.background = "green";
    button1.onPointerUpObservable.add(function() {
        button1.dispose();
        createVideoTexture();
    });
    advancedTexture.addControl(button1);

    //console.log(ANote0Video);
    return scene;
};
