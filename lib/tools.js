var fs = require('fs');

module.exports = {
    stringToBool: function (aBoolString) {
        return aBoolString.toLowerCase() === "false" ? false : true;
    },
    parseProperty: function (aProp, elementToSet) {
        if (Array.isArray(aProp)) {
            aProp.forEach(function (prop) {
                module.exports.parseProperty(prop, elementToSet);
            });
        } else {
            var val = null;

            switch (aProp.xsi$type) {
                case "BooleanProperty":
                    val = module.exports.stringToBool(aProp.Value);
                    break;
                case "StringProperty":
                    val = aProp.Value;
                    break;
                case "NumericProperty":
                    val = +aProp.Value;
                    break;
                case "DateTimeProperty":
                    val = new Date(aProp.Value);
                    break;
                default:
                    console.log("UNKNOWN PROPERTY FOR GENERIC SENSOR " + aProp.xsi$type);
            }

            elementToSet.PropertyType = aProp.xsi$type;
            elementToSet.PropertyName = aProp.Name;
            elementToSet[aProp.Name] = val;
        }
    },
    convertType: function(propertyType, value, setToValue) {
        switch (propertyType) {
            case "BooleanProperty":
                setToValue.Value = value === true ? "True" : "False";
                return value === true;
                break;
            case "StringProperty":
                setToValue.Value = value;
                return value;
                break;
            case "NumericProperty":
                setToValue.Value = +value;
                return +value;
                break;
            default:
                console.log("UNKNOWN PROPERTY FOR GENERIC SENSOR " + aProp.xsi$type);
        }
        
        return null;
    },
    fileExists: function (aFileName) {
        try {
            fs.statSync(aFileName);
        }
        catch (e) {
            return false;
        }

        return true;
    },
    mergeObjects: function (obj1, obj2) {
        var obj3 = {};

        for (var attrname in obj1) {
            obj3[attrname] = obj1[attrname];
        }
        for (var attrname in obj2) {
            obj3[attrname] = obj2[attrname];
        }
        return obj3;
    }
};