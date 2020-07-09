var pageX = 0, pageY = 0;
var menuPositionX, menuPositionY; // Limitations: Mouse Pos use is not possible if the user hasn't moved the mouse!
var engine, world, mouseConstraint, render;

var width = 900;
var height = 550;
var wallDepth = 50;

var mode, insertionMode;
var clickedBody, edit;

// ---------------------------
// ENUMS
// ---------------------------


var Modes = {
    SIM: 0,
    STRING: 1
};

var InsertionModes = {
    RECTANGLE: 0,
    CIRCLE: 1
};

var Presets = {
    ATWOOD: "atwood",
    TABLE: "table",
    NEWTONS_CRADLE: "newtons-cradle"
};

// ---------------------------
// INITIALIZATION
// ---------------------------

$( document ).ready(init);

function init() { // Function to be called after loading the page
    mode = Modes.SIM;
    insertionMode = InsertionModes.RECTANGLE;
    $( document ).on("mousemove", function( e ) {
        pageX = e.pageX;
        pageY = e.pageY;
    });
    initCanvas();
    initContextMenu();
}

function initContextMenu() { // For initializing the context menu available using RMB
    $("#matter").on( "contextmenu", function(e) {
        toggleMenu(); // Show the menu
        $(".context-menu").css({"left" : pageX, "top" : pageY}); // Position the context menu
        // Set the menuPosition to the mousePosition
        menuPositionX = pageX;
        menuPositionY = pageY;
        checkBodyClick({ x: menuPositionX, y: menuPositionY }); // Check if a body was selected
        e.preventDefault(); // Prevent the default action from happening
    });
    $("#matter").click( function(e) {
        checkBodyClick({ x: pageX, y: pageY }); // Check if a body was selected
    });
    $("#content").click( function(e) { // Hide the menu when user aborts it
        hideMenu();
    });
    $( document ).keyup( function(e) { // Respond to key strokes
        if(e.key == "Escape") {
            hideMenu(); // Hide the menu when user aborts it
            if(mode == Modes.STRING) {
                changeMode(Modes.SIM); // Switch to Simulation
            }
        }
    });
}

// MATTER JS

function initCanvas() { // Matter.JS initialization
    // module aliases
    var Engine = Matter.Engine,
        Render = Matter.Render,
        Constraint = Matter.Constraint,
        Events = Matter.Events,
        MouseConstraint = Matter.MouseConstraint,
        Mouse = Matter.Mouse,
        World = Matter.World;
        
    // create engine
    engine = Engine.create();
    world = engine.world;

    // create renderer
    render = Render.create({
        canvas: matter,
        engine: engine,
        options: {
            width: width,
            height: height,
            showAngleIndicator: false,
            wireframes: false,
            showCollisions: false,
            showVelocity: false
        }
    });
    
    setupWalls();
    
    // add mouse control
    mouse = Mouse.create(render.canvas),
        mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: {
                stiffness: 0.2,
                render: {
                    visible: false
                }
            }
        });
    
    World.add(world, mouseConstraint);
    
    Events.on(mouseConstraint, 'enddrag', onEndDrag); // Register onEndDrag event
        
    // keep the mouse in sync with rendering
    render.mouse = mouse;
    
    // fit the render viewport to the scene
    Render.lookAt(render, {
        min: { x: 0, y: 0 },
        max: { x: width, y: height }
    });
    
    
    // run the engine
    Engine.run(engine);
    
    // run the renderer
    Render.run(render);
    //toggleGravity();
}

function setupWalls(){
    var settings = { isStatic: true, isWall: true};
    Matter.World.add(world, [
        Matter.Bodies.rectangle(width / 2, 0, width, wallDepth, settings),
        Matter.Bodies.rectangle(width / 2, height, width, wallDepth, settings),
        Matter.Bodies.rectangle(width, height / 2, wallDepth, height, settings),
        Matter.Bodies.rectangle(0, height / 2, wallDepth, height, settings)
    ]);
}


// ---------------------------
// EVENT HANDLERS
// ---------------------------
// MATTER JS:

function onEndDrag(event) { // For adding strings.
    if(mode == Modes.STRING) {
        var Query = Matter.Query,
            Composite = Matter.Composite;
        var bodies = Composite.allBodies(engine.world);
        var queryResult = Query.point(bodies, event.mouse.mouseupPosition);
        if(queryResult.length === 0 || event.body == queryResult[0]) {
            return;
        }
        var bodyA = event.body, bodyB = queryResult[0];
        if(bodyA.hasChain || bodyB.hasChain) {
            return;
        }
        createChain(bodyA, bodyB, false);
    }
}

// DOM:

function addMass() {
    var density = parseFloat($("#add_mass_number").val());
    var size = parseFloat($("#sizeInput").val());
    var friction = parseFloat($("#frictionSlider").val());
    var frictionAir = parseFloat($("#frictionAirSlider").val());
    var restitution = parseFloat($("#restitutionSlider").val());
    var isStatic = $("#add_mass_static_checkbox").prop('checked');
    if(insertionMode == InsertionModes.RECTANGLE) {
        addRectangle(density, size, friction, frictionAir, restitution, isStatic);
    } else if(insertionMode == InsertionModes.CIRCLE) {
        addCircle(density, size, friction, frictionAir, restitution, isStatic);
    }
}
function addRectangle(density, size, friction, frictionAir, restitution, isStatic) { // For adding objects with mass.
    var World = Matter.World,
        Bodies = Matter.Bodies;
    var frictionAirGrav = engine.world.gravity.scale === 0 ? 1 : frictionAir;
    
    var box = Bodies.rectangle(menuPositionX, menuPositionY, size, size,
        {
            density: density,
            frictionAir: frictionAirGrav,
            friction: friction,
            frictionStatic: 0.8,
            restitution: restitution,
            isStatic: engine.world.gravity.scale > 0 ? isStatic : false,
            isStaticOld: engine.world.gravity.scale > 0 ? null : isStatic
        }
    );
    if(engine.world.gravity.scale == 0) {
        box.isStatic = true
    }
    box.frictionAirOld = frictionAir
    
    // add all of the bodies to the world
    World.add(engine.world, box);
    hideMenu();
}

function addCircle(density, size, friction, frictionAir, restitution, isStatic) {
    var World = Matter.World,
    Bodies = Matter.Bodies;
    var frictionAirGrav = engine.world.gravity.scale === 0 ? 1 : frictionAir;
    
    var box = Bodies.circle(menuPositionX, menuPositionY, size / 2,
        {
            density: density,
            frictionAir: frictionAirGrav,
            friction: friction,
            frictionStatic: 0.8,
            restitution: restitution,
            isStatic: isStatic
        }
    );
    box.frictionAirOld = frictionAir
    
    // add all of the bodies to the world
    World.add(engine.world, box);
    hideMenu();
}

// ---------------------------
// MODE HANDLING
// ---------------------------
// MATTER JS:

function changeMode(newMode) { // Change and init mode
    mode = newMode;
    if(mode == Modes.SIM) {
        enableGravity();
        setDynamic();
        mouseConstraint.constraint.render.visible = false;
        $(".exit-string-mode").removeClass("active");
        $(".gravity-button").prop("disabled", false);
    } else {
        disableGravity();
        setStatic();
        mouseConstraint.constraint.render.visible = true;
        $(".exit-string-mode").addClass("active");
        $(".gravity-button").prop("disabled", true);
    }
}

// ---------------------------
// CONTROLS MENU
// ---------------------------

function resetCanvas() {
    disableEdit();
    var Composite = Matter.Composite;
    var bodies = Composite.allBodies(engine.world);
    var constraints = Composite.allConstraints(engine.world);
    var composites = Composite.allComposites(engine.world);
    
    function remove(element) {
        if(!element.isWall && element.label != "Mouse Constraint") {
            Composite.remove(world, element);
        }
    }

    bodies.forEach( remove );
    constraints.forEach( remove );
    composites.forEach( remove );
    enableGravity();
}

function onInsertionDropdownChanged() {
    if($("#insertionDropdown").val() == "rect") {
        insertionMode = InsertionModes.RECTANGLE;
    } else if ($("#insertionDropdown").val() == "circle") {
        insertionMode = InsertionModes.CIRCLE;
    }
}

function toggleWireframes() {
    if(render.options.wireframes === true) {
        render.options.wireframes = false;
        render.options.showCollisions = false;
        render.options.showAngleIndicator = false;
        render.options.showVelocity = false;
    } else {
        render.options.wireframes = true;
        render.options.showCollisions = true;
        render.options.showAngleIndicator = true;
        render.options.showVelocity = true;
    }
    $(".wireframe").toggleClass("active");
}

function enableEdit() {
    if(edit == false) {
        $("#add_mass_number").prop("old", $("#add_mass_number").val());
        $("#frictionSlider").prop("old", $("#frictionSlider").val());
        $("#frictionAirSlider").prop("old", $("#frictionAirSlider").val());
        $("#add_mass_static_checkbox").prop('old', $("#add_mass_static_checkbox").prop("checked"));
    }
    edit = true;
    $("#bodyLabel").html(": " + clickedBody.label);
    $("#bodyLabel").addClass("active");
    $("#insertionDropdown").prop('disabled', true);
    $("#sizeInput").prop('disabled', true);
    
    $("#add_mass_number").val(parseFloat(clickedBody.density));
    $("#frictionSlider").val(parseFloat(clickedBody.friction));
    $("#frictionAirSlider").val(parseFloat(clickedBody.frictionAir));
    $("#add_mass_static_checkbox").prop('checked', clickedBody.isStatic);
    
}

function disableEdit() {
    if(edit == true) {
        $("#add_mass_number").val($("#add_mass_number").prop("old"));
        $("#frictionSlider").val($("#frictionSlider").prop("old"));
        $("#frictionAirSlider").val($("#frictionAirSlider").prop("old"));
        $("#add_mass_static_checkbox").prop('checked', $("#add_mass_static_checkbox").prop("old"));
    }
    edit = false;
    $("#bodyLabel").removeClass("active");
    $("#insertionDropdown").prop('disabled', false);
    $("#sizeInput").prop('disabled', false);
    $("restitutionSlider").val();
}


function onMassNumberChanged() {
    if(edit) {
        clickedBody.density = parseFloat($("#add_mass_number").val());
    }
}

function onFrictionSliderChanged() {
    if(edit) {
        clickedBody.friction = parseFloat($("#frictionSlider").val());
    }
}

function onFrictionAirSliderChanged() {
    if(edit) {
        clickedBody.frictionAir = parseFloat($("#frictionAirSlider").val());
    }
}

function onRestitutionSliderChanged() {
    if(edit) {
        clickedBody.restitution = parseFloat($("#restitutionSlider").val());
    }
}

function onStaticCheckboxChanged() {
    if(edit) {
        clickedBody.isStatic = $("#add_mass_static_checkbox").prop('checked');
    }
}

// ---------------------------
// CONTEXT MENU
// ---------------------------

function toggleMenu() { // Toggle context menu
    $(".context-menu").toggleClass("active");
}

function hideMenu() { // Hide context menu
    $(".context-menu").removeClass("active");
    hideDeleteBody();
}

function checkBodyClick(coords) {
    var Query = Matter.Query,
        Composite = Matter.Composite;
    var bodies = Composite.allBodies(engine.world);
    var queryResult = Query.point(bodies, coords);
    if(queryResult.length === 0 || queryResult[0].isWall) {
        disableEdit();
        clickedBody = null;
        return;
    }
    clickedBody = queryResult[0];
    enableEdit();
    showDeleteBody();
}

function showDeleteBody() {
    $("#delete").addClass("active");
}

function hideDeleteBody() {
    $("#delete").removeClass("active");
}

// ---------------------------
// PRESETS
// ---------------------------

function onPresetDropdownChanged() {
    applyPreset($("#presetDropdown").val());
}

function applyPreset(preset) {
    resetCanvas();
    var World = Matter.World,
        Bodies = Matter.Bodies;
    
    switch(preset) {
        case Presets.TABLE:
            World.add(world, [
                Bodies.rectangle(width / 3, height / 6 * 5 - wallDepth / 2, 25, height / 3, { isStatic: true }),
                Bodies.rectangle(width / 3 * 2, height / 6 * 5 - wallDepth / 2, 25, height / 3, { isStatic: true }),
                Bodies.rectangle(width / 2, height / 3 * 2 - wallDepth / 4, width / 3 - wallDepth / 2, 25, { isStatic: true })
            ]);
            break;
        case Presets.ATWOOD:
            var rect1 = Bodies.rectangle(width / 3, height / 3, 50, 50, {
                isStatic: false,
                density: 0.06,
                friction: 0,
                frictionAir: 0
            });
            var rect2 = Bodies.rectangle(width / 3 * 2, height / 3, 50, 50, {
                isStatic: false,
                density: 0.05,
                friction: 0,
                frictionAir: 0
            });
            var circle = Bodies.circle(width / 2, height / 2, 30, {
                isStatic: true,
                friction: 0
            });
            createChain(rect1, rect2, true);
            World.add(world, [
                circle,
                rect1,
                rect2,
            ]);
            //disableGravity();
            break;
        case Presets.NEWTONS_CRADLE:
            Matter.World.add(engine.world,Matter.Composites.newtonsCradle(width / 3, height / 2 - 150, 5, 30, 300))
            break;
    }
}

// ---------------------------
// UTILITY FUNCTIONS
// ---------------------------
// MATTER JS

function toggleGravity() { // For toggling gravity
    if(engine.world.gravity.scale > 0) {
        disableGravity();
    } else {
        enableGravity();
    }
    $(".gravity").toggleClass("active");
}

function disableGravity() { // For disabling gravity
    engine.world.gravity.scale = 0;
    resetVelocity();
    hideMenu();
}

function enableGravity() { // For enabling gravity
    engine.world.gravity.scale = 0.001;
    resetVelocity();
    hideMenu();
    setTimeout( function() {
    
        var Composite = Matter.Composite;
        if(mode == Modes.SIM) { // Other mode other rules
            var bodies = Composite.allBodies(engine.world);
            if(engine.world.gravity.scale > 0) { // Only renable velocity it is isn't enabled (gravity!)
                for (var i = 0; i < bodies.length; i++) {
                    var body = bodies[i];
            
                    if (body.isStatic || body.isSleeping) // They're not revelant
                        continue;
                    //body.frictionAir = body.frictionAirOld;
                    body.frictionAir = 0.001;
                }
            }
        }
    }, 10);
}

function setStatic() {
    var Composite = Matter.Composite;
    var bodies = Composite.allBodies(engine.world);

    for (var i = 0; i < bodies.length; i++) {
        var body = bodies[i];
        if (body.isSleeping)
            continue;
        body.isStaticOld = body.isStatic;
        body.isStatic = true;
    }
}

function setDynamic() {
    var Composite = Matter.Composite;
    var bodies = Composite.allBodies(engine.world);

    for (var i = 0; i < bodies.length; i++) {
        var body = bodies[i];
        if (body.isSleeping)
            continue;
        body.isStatic = body.isStaticOld;
    }
}

function resetVelocity() { // For resetting all bodies' velocity after switching off gravity
    var Composite = Matter.Composite;
    var bodies = Composite.allBodies(engine.world);

    for (var i = 0; i < bodies.length; i++) {
        var body = bodies[i];

        if (body.isStatic || body.isSleeping)
            continue;
        body.frictionAirOld = body.frictionAir;
        body.frictionAir = 1;
    }
}

function diff (num1, num2) {
  if (num1 > num2) {
    return (num1 - num2);
  } else {
    return (num2 - num1);
  }
};

function deleteBody() {
    var World = Matter.World
        Composite = Matter.Composite;
    if(clickedBody != null) {
        /*var composites = Composite.allComposites(engine.world);
        console.log(clickedBody)
        composites.forEach( function(element) {
            console.log(Composite.allBodies(element));
            if(Composite.allBodies(element).includes(clickedBody)) {
                Composite.remove(world, element);
            }
        });*/
        World.remove(engine.world, clickedBody);
    }
    disableEdit();
    hideMenu();
}

function createChain(startObject, endObject, disable_static_auto) {
    startObject.hasChain = true; // For preventing glitching boxes
    endObject.hasChain = true;
    
    var rope, segments, orientation;
    var group = Matter.Body.nextGroup(true);
    
    if(diff(startObject.position.x,endObject.position.x) > diff(startObject.position.y,endObject.position.y)){
        orientation = "x";
    }else{
        orientation = "y";
    }
    
    if(orientation == "x") {
        segments = Math.abs(startObject.position.x - endObject.position.x) / 30;
    } else if(orientation == "y") {
        segments = Math.abs(startObject.position.y - endObject.position.y) / 30;
    }
    
    add_object_to_group(startObject);
    add_object_to_group(endObject);
    
    function add_object_to_group(object) {
        object.collisionFilter.group = group;
    }
    function create_stack(start_x, start_y, segment_count_x, segment_count_y) {
        rope = Matter.Composites.stack(start_x, start_y , segment_count_x, segment_count_y, 10, 10, function(x, y){
            return Matter.Bodies.rectangle(x, y, 50, 20,
                {
                    collisionFilter: { group: group },
                    chamfer: 5,
                    density: 0.5,
                    friction: 0,
                    frictionAir: 0,
                }
            );
        });
    }
    function chain_segments() {
        Matter.Composites.chain(rope, 0.3, 0, -0.3, 0,
            {
                stiffness: 0.9,
                damping: 0.9,
                length: 0
            }
        );
    }
    function connect_point(index, object) {
        var pointA, pointB;
        
        pointA = { x: 0, y:  0};
        pointB = { x: 0, y:  0};
        
        Matter.Composite.add(rope, Matter.Constraint.create({ 
            bodyA: object,
            bodyB: rope.bodies[index],
            pointA: pointA,
            pointB: pointB,
            stiffness: 0.9,
            length: 0.9,
            damping: 0.1
        }));
    }
    
    if (orientation == "x") {
        create_stack(startObject.position.x, startObject.position.y, segments, 1);
    } else if (orientation = "y") {
        create_stack(startObject.position.x, startObject.position.y, 1, segments);
    }
    
    chain_segments();
    
    connect_point(0, startObject);
    connect_point(rope.bodies.length-1, endObject);
    
    startObject.isStatic = true;
    endObject.isStatic = true;
    
    Matter.World.add(world, [rope]);
    
    if(disable_static_auto){
        setTimeout( function() {
            startObject.isStatic = false;
            endObject.isStatic = false;
        }, 1500);
    }
    
}