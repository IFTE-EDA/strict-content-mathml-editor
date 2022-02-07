var add_symbol = function() {
    var input = document.getElementById("input_symbol");
    var name = input.value;
    name_parts = name.split("_");
    name = name_parts.join("");

    var latex;
    if (name_parts.length > 1) {
        latex = name_parts[0] + "_\\text{" + name_parts.slice(1).join("") + "}";
    } else {
        latex = "\\text{" + name_parts[0] + "}";
    }
    Guppy("guppy1").engine.add_symbol(name, {
        "output": {
            "latex": latex,
            "asciimath": name
        },
        "attrs": {
            "group": "custom",
            "type": name
        }
    });
    input.value = "";
}

window.onload = function(){
    // ID of the editor's div
    var editor_id = "guppy1";
    // output textarea
    var output_mathml = document.getElementById("output_mathml");

    // update output textarea when editor content changes
    var update_output = function(e) {
        try {
            var engine = e.target.engine;
            var doc = engine.doc;
            var content = (new XMLSerializer()).serializeToString(guppy_xml_to_mathml(engine, doc));
            content = vkbeautify.xml(content, 4);
            output_mathml.value = content;
        }
        catch(e) {
            output_mathml.value = "Failed to parse input: " + e.message;
        }
    }

    // tab completion after backslash prints all candidates in the output textarea
    var completion = function(e) {
        output_mathml.value = e.candidates.join(", ");
    }

    Guppy.init({
        "osk":new GuppyOSK(),
        "path":"node_modules/guppy-js",
        "symbols":["node_modules/guppy-js/sym/symbols.json","node_modules/strict-content-mathml-editor/strict-content-mathml-symbols.json"],
        "events": {
            "ready": update_output,
            "change": update_output,
            "completion": completion
        },
        "settings":{
            "empty_content": "{\\text{Click to start typing math!}}"
        },
    });

    var g1 = new Guppy(editor_id);
}
