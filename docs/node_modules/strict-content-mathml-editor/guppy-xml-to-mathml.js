/*
 * TODO
 * - [done] support units and prefixes
 * - [done] support all relevant content dictionaries
 * - [done] support number types (integer, real, rational)
 * - [done] support cases environment (see guppy-js docs)
 * - [done] support prog1 content dictionary
 * - [done] support definition of custom symbols (e.g. "Umax")
 * - [done] support arith1/product and arith1/sum
 * - add help to website (e.g., definition of piecewise functions)
 * - support customizable namespace
 * - support mathematical constants (Pi, Euler's number, ...)
 * - support exp function
 * - support n-ary arith1/plus: instead of 1+2+3 => (+, (+, 1, 2), 3); make (+, 1, 2, 3)
 * - support n-ary arith1/times: instead of 1*2*3 => (*, (*, 1, 2), 3); make (*, 1, 2, 3)
 * - support n-ary logic1/*
 * - support quantifiers "exists" and "forall"
 * - support number types (2+3i -> complex; not necessary: double (-0,+inf,-inf, NaN, -1E4); hexdouble)
 * - support import of Strict Content MathML code
 * - support for structure sharing (id --> <mml:share href="#id"/>): automatic detection?; separate definition of variables that can be used in the main function?
 */

var guppy_xml_to_mathml = function(engine, doc) {
    var rxNumber = /^<cn>([^<]+)<\/cn>$/;
    var rxInteger = /^<cn>([+-]?\d+)<\/cn>$/;
    var rxVariable = /^<ci>([^<]+)<\/ci>$/;

    var csymbol = function(cd, name) {
        return '<csymbol cd="' + cd + '">' + name + '</csymbol>';
    };
    var apply = function(cd, fn, args) {
        return '<apply>' + csymbol(cd, fn) + args.join("") + '</apply>';
    };
    var bind = function(cd, fn, variables, content) {
        return '<bind>' + csymbol(cd, fn) + '<bvar>' + variables.join("</bvar><bvar>") + '</bvar>' + content + '</bind>';
    };


    var functions = {};

    var simple_commands = {
        "arith1": {
            "abs": "absolutevalue",
            "divide": "fraction",
            "plus": "+",
            "power": "exponential",
            "times": "*",
        },
        "directives1": {
            "evaluate": "eval"
        },
        "integer1": {
            "factorial": "factorial"
        },
        "logic1": {
            "and": "and",
            "nand": "nand",
            "nor": "nor",
            "not": "not",
            "or": "or",
            "xnor": "xnor",
            "xor": "xor"
        },
        "norm1": {
            "Euclidean_norm": "norm"
        },
        "nums1": {
        },
        "prog1": {
            "assignment": "assignment",
            "if": "if",
            "for": "for",
            "function_block": "functionBlock",
            "function_call": "functionCall",
            "function_definition": "functionDefinition",
            "procedure_block": "procedureBlock",
            "procedure_call": "procedureCall",
            "procedure_definition": "procedureDefinition",
            "while": "while"
        },
        "relation1": {
            "eq": "=",
            "lt": "<",
            "gt": ">",
            "neq": "!=",
            "leq": "<=",
            "geq": ">="
        },
        "rounding1": {
            "ceiling": "ceil",
            "floor": "floor"
            //"round"
            //"trunc"
        },
        "transc1": {
            "arccos": "arccos",
            //"arccosh"
            //"arccot"
            //"arccoth"
            //"arccsc"
            //"arccsch"
            //"arcsec"
            //"arcsech"
            "arcsin": "arcsin",
            //"arcsinh"
            "arctan": "arctan",
            //"arctanh"
            "cos": "cos",
            "cosh": "cosh",
            "cot": "cot",
            //"coth"
            "csc": "csc",
            //"csch"
            //"exp"
            "ln": "ln",
            "log": "log",
            "sec": "sec",
            //"sech"
            "sin": "sin",
            "sinh": "sinh",
            "tan": "tan",
            "tanh": "tanh"
        },
    };

    // Iterate entries in simple_commands variable and create functions that generate
    // corresponding MathML code.
    for (var cd_name in simple_commands) {
        var cd = simple_commands[cd_name];
        for (var op in cd) {
            functions[cd[op]] = function(cd_name, op) {
                return function(args) {
                    return apply(cd_name, op, args);
                };
            }(cd_name, op);
        }
    }

    // commands that have a list as single argument
    var list_commands = {
        "linalg2": {
            "vector": "vector"
        },
        "prog1": {
            "block": "block",
            "call_arguments": "callArguments",
            "def_arguments": "defArguments",
            "global_var": "globalVar",
            "local_var": "localVar",
            "return": "return"
        }
    }

    // Iterate entries in list_commands variable and create functions that generate
    // corresponding MathML code.
    for (var cd_name in list_commands) {
        var cd = list_commands[cd_name];
        for (var op in cd) {
            functions[cd[op]] = function(cd_name, op) {
                return function(args) {
                    return apply(cd_name, op, args[0]);
                };
            }(cd_name, op);
        }
    }
    // Create catalog of all variables that generate special MathML code (and
    // not <ci>...</ci>).
    var variables = {
        "false": {"cd": "logic1"},
        "infinity": {"cd": "nums1"},
        "otherwise": {"cd": "piece1"}, // used for piece-wise defined functions
        "true": {"cd": "logic1"},
    };

    // Iterate all symbols known to the engine and create functions for units
    // and prefixes that generate corresponding MathML code.
    for (var symbol_name in engine.symbols) {
        var symbol = engine.symbols[symbol_name];
        if (symbol.attrs.group == "units") {
            variables[symbol_name] = {"cd": symbol.attrs.cd};
        } else if (symbol.attrs.group == "prefixes") {
            functions[symbol_name] = function(cd_name, symbol_name) {
                return function(args) {
                    return apply("units_ops1", "prefix", [csymbol("units_siprefix1", symbol_name), args[0]]);
                };
            }(symbol.attrs.cd, symbol_name);
        }
    }

    functions["-"] = function(args) {
        if (args.length == 1) {
            var number = rxNumber.exec(args[0]);
            if (number) {
                return '<cn>' + '-' + number[1] + '</cn>';
            } else {
                return apply("arith1", "unary_minus", args);
            }
        } else {
            return apply("arith1", "minus", args);
        }
    };

    functions["cases"] = function(args) {
        // each element in args[0] is a piece
        var pieces = args[0].map(function(piece) {
            return apply("piece1", "piece", piece);
        });
        return apply("piece1", "piecewise", pieces);
    };

    functions["defintegral"] = function(args) {
        var lower_bound = args[0];
        var upper_bound = args[1];
        var variable = rxVariable.exec(args[3]);
        if (variable === null) {
            throw Error("Variable of integration required.");
        }
        return apply("calculus1", "defint", [
            apply("interval1", "ordered_interval", [lower_bound, upper_bound]),
            bind("fns1", "lambda", [variable[0]], args[2])
        ]);
    };

    functions["derivative"] = function(args) {
        var variable = rxVariable.exec(args[1]);
        if (variable === null) {
            throw Error("Variable of differentiation required.");
        }
        return apply("calculus1", "diff", [
            bind("fns1", "lambda", [variable[0]], args[0])
        ]);
    };

    functions["integral"] = function(args) {
        var variable = rxVariable.exec(args[1]);
        if (variable === null) {
            throw Error("Variable of integration required.");
        }
        return apply("calculus1", "int", [
            bind("fns1", "lambda", [variable[0]], args[0])
        ]);
    };

    functions["list"] = function(args) {
        return args;
    };

    functions["matrix"] = function(args) {
        // each element in args[0] is a row
        var rows = args[0].map(function(row) {
            return apply("linalg2", "matrixrow", row);
        });
        return apply("linalg2", "matrix", rows);
    };

    functions["product"] = function(args) {
        var variable = rxVariable.exec(args[0]);
        if (variable === null) {
            throw Error("Lower bound must assign a value to a variable.");
        }
        var lower_bound = args[1];
        var upper_bound = args[2];
        var fun = args[3];
        return apply("arith1", "product", [
            apply("interval1", "integer_interval", [lower_bound, upper_bound]),
            bind("fns1", "lambda", [variable[0]], fun)
        ]);
    };

    functions["squareroot"] = function(args) {
        return apply("arith1", "root", [args[0], '<cn type="integer">2</cn>']);
    };

    functions["subscript"] = function(args) {
        var variable = rxVariable.exec(args[0]);
        if (variable === null) {
            throw Error("Only variables may have subscripts.");
        }
        var subscript =  rxVariable.exec(args[1])
            || rxInteger.exec(args[1]);
        if (subscript === null) {
            throw Error("Subscript has to be an integer or variable.");
        }
        return '<ci>' + variable[1] + '_' + subscript[1] + '</ci>';
    };

    functions["summation"] = function(args) {
        var variable = rxVariable.exec(args[0]);
        if (variable === null) {
            throw Error("Lower bound must assign a value to a variable.");
        }
        var lower_bound = args[1];
        var upper_bound = args[2];
        var fun = args[3];
        return apply("arith1", "sum", [
            apply("interval1", "integer_interval", [lower_bound, upper_bound]),
            bind("fns1", "lambda", [variable[0]], fun)
        ]);
    };

    functions["root"] = function(args) {
        return apply("arith1", "root", [args[1], args[0]]);
    };

    functions["val"] = function(args) {
        return '<cn>' + args[0] + '</cn>';
    };

    functions["var"] = function(args) {
        if (args[0] in variables) {
            return csymbol(variables[args[0]].cd, args[0]);
        } else {
            return '<ci>' + args[0] + '</ci>';
        }
    };

    var ans = "";
    // Do not evaluate the AST if it is empty.
    if (typeof(doc.syntax_tree()[1]) != "undefined") {
        ans = doc.evaluate(functions);
    }
    var mml = (new window.DOMParser()).parseFromString('<math>' + ans + '</math>', "text/xml")

    // Iterate over all numbers (<cn>...</cn>) and detect integers, real numbers
    var numbers = mml.querySelectorAll("cn");
    var numbersLength = numbers.length;
    for (var i = 0; i < numbersLength; i++) {
        var number = numbers[i];
        if (number.firstChild.nodeType == Node.TEXT_NODE) {
            // detect integers
            if (/^[+-]?\d+$/.exec(number.firstChild.nodeValue)) {
                numbers[i].setAttribute("type", "integer");
            }
            // detect real numbers
            else if (/^[+-]?\d*\.\d+$/.exec(number.firstChild.nodeValue)) {
                numbers[i].setAttribute("type", "real");
            }
            else {
                throw Error("Unsupported number format: " + number.firstChild.nodeValue);
            }
        }
    }
    // Iterate over all fractions of integers (divide(int1, int2)) and convert
    // them to rational numbers.
    var function_calls = mml.querySelectorAll("apply");
    var function_calls_length = function_calls.length;
    for (var i = 0; i < function_calls_length; i++) {
        var function_call = function_calls[i];
        if (function_call.childElementCount == 3) {
            var fun = function_call.childNodes[0];
            var c1 = function_call.childNodes[1];
            var c2 = function_call.childNodes[2];
            if (fun.nodeName == "csymbol" &&
                fun.getAttribute("cd") == "arith1" &&
                fun.firstChild.nodeType == Node.TEXT_NODE &&
                fun.firstChild.nodeValue == "divide" &&
                c1.nodeName == "cn" &&
                c1.getAttribute("type") == "integer" &&
                c2.nodeName == "cn" &&
                c2.getAttribute("type") == "integer") {

                fun.setAttribute("cd", "nums1");
                fun.firstChild.nodeValue = "rational";
            }
        }
    }
    return mml;
}
