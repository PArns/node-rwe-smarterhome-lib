var util = require('util');

const EventEmitter = require('events').EventEmitter;
const tools = require("./tools");

// Generic device creator function
module.exports = function (parseData, API) {

    try {
        return eval("new " + encodeURI(parseData.xsi$type) + "(parseData, API);");
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
};

// #####################################################################################################################

BaseDevice = function (parseData, API) {
    BaseDevice.super_.call(this);

    var that = this;

    this.API = API;

    this.Type = parseData.xsi$type;
    this.Name = parseData.Name;
    this.LCID = parseData.LCID;
    this.Id = parseData.Id.$text;
    this.IsPhysicalDevice = false;

    this._updateState = function (settings) {
        that.State = settings;

        that.emit("StatusChanged", this);
        API.emit("StatusChanged", this);
    };

    this._setState = function (state) {
        that.State = state;
    };

    this.getFriendlyState = function () {
        if (that.State)
            return that.State.getFriendlyState();

        return "COULD NOT GET FRIENDLY STATUS FOR " + this.Type;
    };

    this.setState = function (state, callback) {
        var c = that.State;

        if (c) {
            c.setState(state);
            API._setDeviceStatus(that, c, callback);
        }
        else
            console.log("WARNING! COULD NOT SET STATE FOR " + this.Type);
    };

    this.getState = function() {
        if (that.State)
            return that.State.getState();

        return null;
    };
};

util.inherits(BaseDevice, EventEmitter);

BaseSensor = function (parseData, API) {
    BaseSensor.super_.call(this, parseData, API);
};

// SENSORS

util.inherits(BaseSensor, BaseDevice);

PhysicalSensor = function (parseData, API) {
    PhysicalSensor.super_.call(this, parseData, API);

    this.BDId = parseData.BDId.$text;
};

util.inherits(PhysicalSensor, BaseSensor);

TemperatureSensor = function (parseData, API) {
    TemperatureSensor.super_.call(this, parseData, API);
};

util.inherits(TemperatureSensor, BaseSensor);

RoomTemperatureSensor = function (parseData, API) {
    RoomTemperatureSensor.super_.call(this, parseData, API);

    this.UDvIds = parseData.UDvIds;
};

util.inherits(RoomTemperatureSensor, TemperatureSensor);

HumiditySensor = function (parseData, API) {
    HumiditySensor.super_.call(this, parseData, API);

    this.UDvIds = parseData.UDvIds;
};

util.inherits(HumiditySensor, BaseSensor);

RoomHumiditySensor = function (parseData, API) {
    RoomHumiditySensor.super_.call(this, parseData, API);
};

util.inherits(RoomHumiditySensor, HumiditySensor);

GenericSensor = function (parseData, API) {
    GenericSensor.super_.call(this, parseData, API);

    this.Pmts = parseData.Pmts;
    this.SDPpN = parseData.SDPpN.$text;

    this.PayLoad = {};

    tools.parseProperty(this.Pmts.Ppt, this.PayLoad);
};

util.inherits(GenericSensor, PhysicalSensor);

WindowDoorSensor = function (parseData, API) {
    WindowDoorSensor.super_.call(this, parseData, API);

    this.Installation = parseData.Installation.$text;
    this.EventFilterTime = parseData.EventFilterTime.$text;
    this.WOpFunc = tools.stringToBool(parseData.WOpFunc.$text);
};

util.inherits(WindowDoorSensor, PhysicalSensor);

PushButtonSensor = function (parseData, API) {
    PushButtonSensor.super_.call(this, parseData, API);

    this.ButtonCount = +parseData.ButtonCount.$text;
};

util.inherits(PushButtonSensor, PhysicalSensor);

SmokeDetectorSensor = function (parseData, API) {
    SmokeDetectorSensor.super_.call(this, parseData, API);
};

util.inherits(SmokeDetectorSensor, PhysicalSensor);

// Actuators

BaseActuator = function (parseData, API) {
    BaseActuator.super_.call(this, parseData, API);

    this.ActCls = parseData.ActCls.$text;
};

util.inherits(BaseActuator, BaseDevice);

PhysicalActuator = function (parseData, API) {
    PhysicalActuator.super_.call(this, parseData, API);

    this.Settings = parseData.DOfStgs;
};

util.inherits(PhysicalActuator, BaseActuator);

ThermostatActuator = function (parseData, API) {
    ThermostatActuator.super_.call(this, parseData, API);
};

util.inherits(ThermostatActuator, PhysicalActuator);

ValveActuator = function (parseData, API) {
    ValveActuator.super_.call(this, parseData, API);

    this.ValveIndex = parseData.ValveIndex.$text;
};

util.inherits(ValveActuator, PhysicalActuator);

RoomTemperatureActuator = function (parseData, API) {
    RoomTemperatureActuator.super_.call(this, parseData, API);

    this.UDvIDs = parseData.UDvIDs;

    this.MxTp = parseData.MxTp.$text;
    this.MnTp = parseData.MnTp.$text;
    this.PhFct = parseData.PhFct.$text;
    this.WLck = parseData.WLck.$text;
    this.RLck = parseData.RLck.$text;
    this.FPrA = parseData.FPrA.$text;
    this.FPr = parseData.FPr.$text;
    this.MPrA = parseData.MPrA.$text;
    this.HMPr = parseData.HMPr.$text;
    this.WOpTp = parseData.WOpTp.$text;
    this.DCTmp = parseData.DCTmp.$text;

    this.IsPhysicalDevice = true;
};

util.inherits(RoomTemperatureActuator, PhysicalActuator);

SwitchActuator = function (parseData, API) {
    SwitchActuator.super_.call(this, parseData, API);
    var that = this;

    this.IsPhysicalDevice = true;
};

util.inherits(SwitchActuator, PhysicalActuator);

GenericActuator = function (parseData, API) {
    GenericActuator.super_.call(this, parseData, API);

    this.Pmts = parseData.Pmts;
    this.SDPpN = parseData.SDPpN.$text;
    this.PfStsPN = parseData.PfStsPN.$text;
};

util.inherits(GenericActuator, PhysicalActuator);

AlarmActuator = function (parseData, API) {
    AlarmActuator.super_.call(this, parseData, API);

    this.IsPhysicalDevice = true;
};

util.inherits(AlarmActuator, PhysicalActuator);

RollerShutterActuator = function (parseData, API) {
    RollerShutterActuator.super_.call(this, parseData, API);

    this.IsPhysicalDevice = true;

    this.TmFU = parseData.TmFU.$text;
    this.TmFD = parseData.TmFD.$text;
    this.IsCalibrating = parseData.IsCalibrating.$text;
};

util.inherits(RollerShutterActuator, PhysicalActuator);