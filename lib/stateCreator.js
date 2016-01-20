var util = require('util');

const tools = require("./tools");

// Generic device creator function
module.exports = {
    createState: function (parseData) {
        try {
            return eval("new " + encodeURI(parseData.xsi$type) + "(parseData);");
        } catch (e) {
            if (parseData.xsi$type) {
                console.log("################################################################");
                console.log(e);
                console.log(parseData);
                console.log("################################################################");
            } else
                console.log("NOT A VALID DEVICE-JSON-DATA");

            return null;
        }
    },
    getStateForClass: function (aClassInstance) {
        var className = "";

        switch (aClassInstance.Type) {
            case "GenericActuator":
                className = "GenericDeviceState";
                break;
            default:
                className = aClassInstance.Type + "State";
        }

        try {
            var c = eval("new " + className + "();");
        } catch (e) {
            console.log("WARNING! THIS DEVICE HAS NO STATE " + aClassInstance.Type);
            console.log("DEVICE", aClassInstance);

            return null;
        }

        c.xsi$type = className;
        c.Type = className;
        c.LID = aClassInstance.Id;

        return c;
    },
    notificationRequestToStateClass: function (notificationRequest) {
        var className = notificationRequest.xsi$type;

        try {
            var c = eval("new " + className + "(notificationRequest);");
            c.Type = className;

            return c;
        } catch (e) {
            console.log("NO STATE CLASS FOUND FOR NOTIFICATION REQUEST ", className);
            console.log("REQUEST ", notificationRequest);
            return null;
        }
    }
};

// #####################################################################################################################

BaseState = function (parseData) {

    this.xsi$type = null;
    this.Type = null;
    this.LID = null;

    if (parseData) {
        this.xsi$type = parseData.xsi$type;
        this.Type = parseData.xsi$type;
        this.LID = parseData.LID;
    }

    this.getFriendlyState = function () {
        return "COULD NOT GET FRIENDLY STATE NAME FOR " + this.Type;
    };

    this.toString = function() {
        return this.getFriendlyState();
    };
};
// Actuators

RoomTemperatureActuatorState = function (parseData) {
    RoomTemperatureActuatorState.super_.call(this, parseData);

    this.PtTmp = null;
    this.OpnMd = null;
    this.WRAc = null;

    if (parseData) {
        this.PtTmp = parseData.PtTmp;
        this.OpnMd = parseData.OpnMd;
        this.WRAc = parseData.WRAc;
    }

    this.getFriendlyState = function () {
        return "Programmed Temperature: " + this.PtTmp + ", Closed: " + this.WRAc + " Mode: " + this.OpnMd;
    };
};

util.inherits(RoomTemperatureActuatorState, BaseState);

SwitchActuatorState = function (parseData) {
    SwitchActuatorState.super_.call(this, parseData);

    var that = this;

    this.IsOn = null;

    if (parseData) {
        this.IsOn = parseData.IsOn;
    }

    this.getFriendlyState = function () {
        return tools.stringToBool(this.IsOn) ? "ON" : "OFF";
    };

    this.setState = function (aState) {
        that.IsOn = aState ? "True" : "False";
    };
};

util.inherits(SwitchActuatorState, BaseState);

RollerShutterActuatorState = function (parseData) {
    RollerShutterActuatorState.super_.call(this, parseData);

    this.ShutterLevel = null;
    var that = this;

    if (parseData) {
        this.ShutterLevel = +parseData.ShutterLevel.$text;
    }

    this.getFriendlyState = function () {
        return this.ShutterLevel;
    };

    this.setState = function (aState) {
        that.ShutterLevel = +aState;
    };
};

util.inherits(RollerShutterActuatorState, BaseState);

AlarmActuatorState = function (parseData) {
    AlarmActuatorState.super_.call(this, parseData);

    var that = this;
    this.IsOn = false;

    if (parseData) {
        this.IsOn = parseData.IsOn.$text;
    }

    this.getFriendlyState = function () {
        return this.IsOn ? "ON" : "OFF";
    }
};

util.inherits(AlarmActuatorState, BaseState);

// Sensors

RoomTemperatureSensorState = function (parseData) {
    RoomTemperatureSensorState.super_.call(this, parseData);

    this.Temperature = null;

    if (parseData) {
        this.Temperature = +parseData.Temperature;
    }

    this.getFriendlyState = function () {
        return this.Temperature;
    }
};

util.inherits(RoomTemperatureSensorState, BaseState);

SmokeDetectionSensorState = function (parseData) {
    SmokeDetectionSensorState.super_.call(this, parseData);

    var that = this;
    this.IsSmokeAlarm = false;

    if (parseData) {
        this.IsSmokeAlarm = parseData.IsSmokeAlarm.$text;
    }

    this.getFriendlyState = function () {
        return this.IsSmokeAlarm ? "ALARM" : "NO ALARM";
    }
};

util.inherits(SmokeDetectionSensorState, BaseState);

RoomHumiditySensorState = function (parseData) {
    RoomHumiditySensorState.super_.call(this, parseData);

    this.Humidity = null;

    if (parseData) {
        this.Humidity = +parseData.Humidity;
    }

    this.getFriendlyState = function () {
        return this.Humidity;
    }
};

util.inherits(RoomHumiditySensorState, BaseState);

WindowDoorSensorState = function (parseData) {
    WindowDoorSensorState.super_.call(this, parseData);

    this.IsOpen = false;

    if (parseData) {
        this.IsOpen = tools.stringToBool(parseData.IsOpen.$text);
    }

    this.getFriendlyState = function () {
        return this.IsOpen ? "OPEN" : "CLOSED";
    }
};

util.inherits(WindowDoorSensorState, BaseState);

// Devices

GenericDeviceState = function (parseData) {
    GenericDeviceState.super_.call(this, parseData);

    if (parseData) {
        this.Ppts = parseData.Ppts;
        this.State = {};

        tools.parseProperty(this.Ppts.Ppt, this.State);
    }

    this.getFriendlyState = function () {
        return JSON.stringify(this.State);
    };

    this.setState = function (state, name) {
        if (!name)
            name = "Value";

        var payLoad = {};

        payLoad.Name = name;

        if ((typeof state) === "boolean") {
            payLoad.xsi$type = "BooleanProperty";
            payLoad.Value = state ? "True" : "False";
        }

        this.Ppts = {
            Ppt: payLoad
        };
    };
};

util.inherits(GenericDeviceState, BaseState);