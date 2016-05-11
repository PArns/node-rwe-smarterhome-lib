var util = require('util');

const tools = require("./tools");
const EventEmitter = require('events').EventEmitter;

// Generic device creator function
module.exports = {
    createState: function (parseData, API) {
        try {
            return eval("new " + encodeURI(parseData.xsi$type) + "(parseData);");
        } catch (e) {
            if (parseData.xsi$type) {
                API.emit("Debug", "################################################################");
                API.emit("Debug", e);
                API.emit("Debug", parseData);
                API.emit("Debug", "################################################################");
            } else
                console.log("NOT A VALID DEVICE-JSON-DATA");

            return null;
        }
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
    BaseState.super_.call(this);

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

    this.getState = function () {
        return false;
    };

    this.toString = function () {
        return this.getFriendlyState();
    };
};

util.inherits(BaseState, EventEmitter);

// Actuators

RoomTemperatureActuatorState = function (parseData) {
    RoomTemperatureActuatorState.super_.call(this, parseData);

    var that = this;

    this.PtTmp = null;
    this.OpnMd = null;
    this.WRAc = null;

    if (parseData) {
        this.PtTmp = parseData.PtTmp;
        this.OpnMd = parseData.OpnMd;
        this.WRAc = parseData.WRAc;
    }

    this.getFriendlyState = function () {
        return "Programmed Temperature: " + that.PtTmp + ", Closed: " + that.WRAc + " Mode: " + that.OpnMd;
    };

    this.getState = function () {
        return that.PtTmp;
    };

    this.setState = function (aState) {
        that.PtTmp = +aState;
        return that.PtTmp;
    };
};

util.inherits(RoomTemperatureActuatorState, BaseState);

SwitchActuatorState = function (parseData) {
    SwitchActuatorState.super_.call(this, parseData);

    var that = this;

    this.IsOn = null;

    if (parseData) {
        this.IsOn = tools.stringToBool(parseData.IsOn);
    }

    this.getFriendlyState = function () {
        return that.IsOn ? "ON" : "OFF";
    };

    this.setState = function (aState) {
        that.IsOn = aState === true ? "True" : "False";
        return aState === true;
    };

    this.getState = function () {
        return that.IsOn;
    };
};

util.inherits(SwitchActuatorState, BaseState);

RollerShutterActuatorState = function (parseData) {
    RollerShutterActuatorState.super_.call(this, parseData);

    this.ShutterLevel = null;
    this.Level = null;
    var that = this;

    if (parseData) {
        this.Level = +parseData.ShutterLevel.$text;
    }

    this.getFriendlyState = function () {
        return that.Level;
    };

    this.setState = function (aState) {
        that.ShutterLevel = {
            "$text": +aState
        };

        that.Level = +aState;
        return that.Level;
    };

    this.getState = function () {
        return that.Level;
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
        return that.IsOn ? "ON" : "OFF";
    };

    this.getState = function () {
        return that.IsOn;
    };
};

util.inherits(AlarmActuatorState, BaseState);

// Sensors

RoomTemperatureSensorState = function (parseData) {
    RoomTemperatureSensorState.super_.call(this, parseData);

    var that = this;
    this.Temperature = null;

    if (parseData) {
        this.Temperature = +parseData.Temperature;
    }

    this.getFriendlyState = function () {
        return that.Temperature;
    };

    this.getState = function () {
        return that.Temperature;
    };
};

util.inherits(RoomTemperatureSensorState, BaseState);

SmokeDetectionSensorState = function (parseData) {
    SmokeDetectionSensorState.super_.call(this, parseData);

    var that = this;
    this.IsSmokeAlarm = false;

    if (parseData) {
        that.IsSmokeAlarm = tools.stringToBool(parseData.IsSmokeAlarm.$text);
    }

    this.getFriendlyState = function () {
        return that.IsSmokeAlarm ? "ALARM" : "NO ALARM";
    };

    this.getState = function () {
        return that.IsSmokeAlarm;
    };
};

util.inherits(SmokeDetectionSensorState, BaseState);

RoomHumiditySensorState = function (parseData) {
    RoomHumiditySensorState.super_.call(this, parseData);

    var that = this;
    this.Humidity = null;

    if (parseData) {
        this.Humidity = parseFloat(parseData.Humidity);
    }

    this.getFriendlyState = function () {
        return that.Humidity;
    };

    this.getState = function () {
        return that.Humidity;
    };
};

util.inherits(RoomHumiditySensorState, BaseState);

WindowDoorSensorState = function (parseData) {
    WindowDoorSensorState.super_.call(this, parseData);

    var that = this;
    this.IsOpen = false;

    if (parseData) {
        this.IsOpen = tools.stringToBool(parseData.IsOpen.$text);
    }

    this.getFriendlyState = function () {
        return that.IsOpen ? "OPEN" : "CLOSED";
    };

    this.getState = function () {
        return that.IsOpen;
    };
};

util.inherits(WindowDoorSensorState, BaseState);

LuminanceSensorState = function (parseData) {
    LuminanceSensorState.super_.call(this, parseData);

    var that = this;
    this.Luminance = 0;

    if (parseData) {
        this.Luminance = +parseData.Luminance.$text;
    }

    this.getFriendlyState = function () {
        return that.Luminance + " %";
    };

    this.getState = function () {
        return that.Luminance;
    };
};

util.inherits(LuminanceSensorState, BaseState);

// Devices

GenericDeviceState = function (parseData) {
    GenericDeviceState.super_.call(this, parseData);

    var that = this;

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
            name = this.State.PropertyName;

        var payLoad = {};

        payLoad.Name = name;
        payLoad.xsi$type = this.State.PropertyType;
        payLoad.Value = null;

        var ret = tools.convertType(this.State.PropertyType, state, payLoad);
        
        this.Ppts = {
            Ppt: payLoad
        };

        return ret;
    };

    this.getState = function () {
        return that.State[that.State.PropertyName];
    };
};

util.inherits(GenericDeviceState, BaseState);