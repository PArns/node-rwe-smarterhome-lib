var crypto = require('crypto');
var https = require('https');
var xml = require('meep-meep-xml');
var fs = require('fs');
var constants = require('constants');

var util = require('util');
const tools = require("./tools");
const EventEmitter = require('events').EventEmitter;

var deviceCreator = require("./deviceCreator");
var stateCreator = require("./stateCreator");

var room = function (jData) {
    this.Id = jData.Id.$text;
    this.Name = jData.Name.$text;
    this.Position = jData.Position.$text;
    this.RTyp = jData.RTyp.$text;
};

var smarthome = function (ip) {
    smarthome.super_.call(this);

    // #################################################################################################################
    // PRIVATE VARS
    // #################################################################################################################

    this._username = "";
    var _password = "";
    var _deviceUpdateTimer = null;
    var _shutdown = false;

    var that = this;

    // #################################################################################################################
    // PUBLIC VARS
    // #################################################################################################################

    this.ip = ip;
    this.FIRMWARE_VERSION = "1.70";

    this.clientId = null;
    this.lastLogin = null;
    this.sessionId = null;
    this.configVersion = null;
    this.isInitialized = false;

    this.rooms = [];
    this.devices = [];

    // #################################################################################################################
    // PRIVATE FUNCTIONS
    // #################################################################################################################

    var getDeviceListFile = function () {
        var dir = './tmp';

        if (!tools.fileExists(dir)) {
            fs.mkdirSync(dir);
        }

        return './tmp/deviceList_' + that._username + '_V' + that.configVersion + '.json';
    };


    var hashPassword = function (aPasswordToHash) {
        var shasum = crypto.createHash('sha256');
        shasum.update(aPasswordToHash);
        return shasum.digest('base64');
    };

    var generateGUID = (function () {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return function () {
            return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                s4() + '-' + s4() + s4() + s4();
        };
    })();

    var createRequest = function (type) {
        var xmlData = {
            BaseRequest: {
                xsi$type: type,
                Version: that.FIRMWARE_VERSION,
                RequestId: generateGUID()
            }
        };

        xml.addNamespace(xmlData.BaseRequest, "xsi", "http://www.w3.org/2001/XMLSchema-instance");

        return xmlData;
    };

    var sendRequest = function (path, xmlData, callback, error_callback) {
        if (!that.clientId)
            that.clientId = generateGUID();

        var chunks = "";

        if (typeof(xmlData) == "string") {
            var tempXml = xmlData;
        } else {
            var tempXml = xml.renderXML(xmlData);
        }

        https.globalAgent.options.secureProtocol = 'TLSv1_method';
        
        var req = https.request(
            {
                hostname: that.ip,
                rejectUnauthorized: false,
                path: '/' + path,
                method: 'POST',
                secureOptions: constants.SSL_OP_NO_TLSv1,
                headers: {
                    'Content-Length': Buffer.byteLength(tempXml, 'utf8'),
                    "ClientId": that.clientId
                }
            }, function (resp) {
                resp.on('data', function (chunk) {
                    resp.setEncoding('utf8');
                    chunks += chunk;
                });
                resp.on('end', function (d) {
                    callback(xml.parseXML(chunks, {autoinline: false, ignorenamespace: false}));
                });
            }, function (error) {
                if (error_callback)
                    error_callback(error);
            }
        );

        req.on('error', function (err) {
            if (error_callback)
                error_callback(err);
        });

        req.write(tempXml);
        req.end();
    };

    var sendLoggedInRequest = function (request, callback, isReLogin, additionalData) {

        var xmlData = "";
        if (request !== "upd") {
            xmlData = createRequest(request);
            xmlData.BaseRequest.SessionId = that.sessionId;
            xmlData.BaseRequest.BasedOnConfigVersion = that.configVersion;

            if (additionalData)
                xmlData.BaseRequest = tools.mergeObjects(xmlData.BaseRequest, additionalData);
        } else {
            xmlData = "upd";
        }

        sendRequest(request === "upd" ? "upd" : "cmd", xmlData, function (resp) {
            if (resp.BaseResponse) {
                if ((typeof(resp.BaseResponse.Error) !== "undefined") && (resp.BaseResponse.Error == "IllegalSessionId")) {
                    if (!isReLogin) {
                        that.login(that._username, _password, function (loginOK) {
                            if (loginOK)
                                sendLoggedInRequest(request, callback, true, additionalData);
                            else if (callback)
                                callback(resp.BaseResponse);
                        });
                    } else {
                        if (callback)
                            callback(resp.BaseResponse);
                    }
                } else {
                    if (resp.BaseResponse.ConfigurationVersion)
                        that.configVersion = resp.BaseResponse.ConfigurationVersion;

                    if (callback)
                        callback(resp.BaseResponse);
                }
            } else if (resp.NotificationList) {
                if (resp.NotificationList.Notifications.LogoutNotification) {
                    callback(false);
                } else if (callback) {
                    callback(resp.NotificationList.Notifications);
                }
            } else {
                if (!isReLogin) {
                    that.login(that._username, _password, function (loginOK) {
                        if (loginOK)
                            sendLoggedInRequest(request, callback, true, additionalData);
                        else if (callback)
                            callback(false, resp);
                    });
                } else if (callback) {
                    callback(false);
                }
            }
        }, function (err) {
            if (!isReLogin) {
                that.login(that._username, _password, function (loginOK) {
                    if (loginOK)
                        sendLoggedInRequest(request, callback, true, additionalData);
                    else if (callback)
                        callback(false, err);
                });
            } else {
                if (callback)
                    callback(false, err);
            }

            that.emit("Debug", err);
        });
    };

    // #################################################################################################################
    // PUBLIC FUNCTIONS
    // #################################################################################################################

    this.login = function (username, password, callback) {
        var loginData = createRequest("LoginRequest");
        loginData.BaseRequest.UserName = username;
        loginData.BaseRequest.Password = hashPassword(password);

        this._username = username;
        _password = password;
        _shutdown = false;

        var that = this;

        sendRequest("cmd", loginData, function (resData) {
            if (resData.BaseResponse.xsi$type == "AuthenticationErrorResponse") {
                that.lastLogin = null;
                that.sessionId = null;
                that.configVersion = null;

                if (callback)
                    callback(false, resData.BaseResponse);
            } else {
                that.lastLogin = new Date();

                if (resData.BaseResponse.SessionId)
                    that.sessionId = resData.BaseResponse.SessionId;

                if (resData.BaseResponse.CurrentConfigurationVersion)
                    that.configVersion = resData.BaseResponse.CurrentConfigurationVersion;

                if (callback)
                    callback(true);
            }
        }, function (error) {
            if (callback)
                callback(false, error);

            that.emit("LoginError", error);
        });
    };

    this.logout = function (callback) {
        if (that.sessionId) {
            var xmlData = createRequest("LogoutRequest");
            xmlData.BaseRequest.SessionId = that.sessionId;

            sendRequest("cmd", xmlData, function () {
                that.lastLogin = null;
                that.sessionId = null;
                that.configVersion = null;

                if (callback)
                    callback();
            });
        } else if (callback)
            callback();
    };

    this.updateDeviceStates = function (callback) {
        sendLoggedInRequest("GetAllLogicalDeviceStatesRequest", function (resp) {

            if (resp && resp.States && resp.States.LogicalDeviceState) {
                var states = resp.States.LogicalDeviceState;

                states.forEach(function (aState) {
                    var state = stateCreator.createState(aState, that);

                    if (state) {
                        var device = that.getDeviceById(state.LID);

                        if (device)
                            device._setState(aState);
                    }
                });

                if (callback)
                    callback(true);
            } else if (callback)
                callback(false);
        });
    };


    this.updateLogicalDeviceStates = function (callback) {
        sendLoggedInRequest("GetAllLogicalDeviceStatesRequest", function (resp) {

            if (resp && resp.States && resp.States.LogicalDeviceState) {
                var states = resp.States.LogicalDeviceState;

                states.forEach(function (aState) {
                    var state = stateCreator.createState(aState, that);

                    if (state) {
                        var device = that.getDeviceById(state.LID);

                        if (device)
                            device._setState(state);
                    }
                });

                if (callback)
                    callback(true);
            } else if (callback)
                callback(false);
        });
    };

    this.updatePhysicalDeviceStates = function (callback) {
        sendLoggedInRequest("GetAllPhysicalDeviceStatesRequest", function (resp) {

            if (resp && resp.DeviceStates && resp.DeviceStates.PhysicalDeviceState) {
                var states = resp.DeviceStates.PhysicalDeviceState;

                states.forEach(function (aState) {
                    var device = that.getDeviceById(aState.PhysicalDeviceId);

                    if (device)
                        device.PhysicalState = aState;
                });

                if (callback)
                    callback(true);
            } else if (callback)
                callback(false);
        });
    };

    this._setDeviceStatus = function (caller, payLoad, callback) {
        var data = {};

        data.ActuatorStates = {
            LogicalDeviceState: payLoad
        };

        sendLoggedInRequest("SetActuatorStatesRequest", callback, false, data);
    };

    this.updateDeviceList = function (callback, force) {
        var _deviceListFile = getDeviceListFile();

        var parseResponse = function (data) {
            if (data && data.LCs && data.LCs.LC && data.LDs && data.LDs.LD) {
                var r = data.LCs.LC;
                var d = data.LDs.LD;

                // Rooms
                that.rooms = [];

                r.forEach(function (aRoom) {
                    that.rooms.push(new room(aRoom))
                });

                // Devices
                that.devices = [];

                d.forEach(function (aDevice) {
                    var cD = deviceCreator(aDevice, that);

                    if (cD)
                        that.devices.push(cD);
                });

                if (callback)
                    callback(true);
            } else if (callback)
                callback(false);
        };

        if (force || !tools.fileExists(_deviceListFile)) {
            sendLoggedInRequest("GetEntitiesRequest", function (resp) {
                fs.writeFileSync(_deviceListFile, JSON.stringify(resp));
                parseResponse(resp);
            });
        } else {
            var resp = JSON.parse(fs.readFileSync(_deviceListFile, 'utf8'));
            parseResponse(resp);
        }
    };

    this.subscribeToNotifications = function () {
        notification = {};
        notification.NotificationType = {$text: "DeviceStateChanges"};
        notification.Action = {$text: "Subscribe"};

        var updates = 0;

        sendLoggedInRequest("NotificationRequest", function (res) {
            if (res === false) {
                that.emit("Debug", res);
            }

            if (_deviceUpdateTimer) {
                clearTimeout(_deviceUpdateTimer);
                _deviceUpdateTimer = null;
            }

            var setDeviceStateUpdate = function (state) {
                var device = that.getDeviceById(state.LID);

                if (device) {
                    var c = stateCreator.notificationRequestToStateClass(state);

                    if (c)
                        device._updateState(c);
                }
            };

            var requestUpdate = function () {
                updates++;

                if (_deviceUpdateTimer)
                    clearTimeout(_deviceUpdateTimer);

                // Lost update counter ....
                if (updates > 60 * 60) {
                    that.init();
                } else {
                    _deviceUpdateTimer = setTimeout(requestUpdate, 1000 * 60 * 10);

                    sendLoggedInRequest("upd", function (data) {
                        if (data.LogicalDeviceStatesChangedNotification && data.LogicalDeviceStatesChangedNotification) {
                            var states = data.LogicalDeviceStatesChangedNotification;

                            if (Array.isArray(states)) {
                                states.forEach(function (state) {
                                    setDeviceStateUpdate(state.LogicalDeviceStates.LogicalDeviceState);
                                });
                            } else {
                                setDeviceStateUpdate(states.LogicalDeviceStates.LogicalDeviceState);
                            }
                        }

                        if (!_shutdown)
                            requestUpdate();
                    });
                }
            };

            if (!_shutdown)
                requestUpdate();

        }, false, notification);
    };

    this.getDeviceById = function (aId) {
        var res = null;
        this.devices.forEach(function (aDevice) {
            if (aDevice.Id === aId)
                res = aDevice;
        });

        return res;
    };

    this.getDeviceByName = function (aName) {
        var res = null;
        this.devices.forEach(function (aDevice) {
            if (aDevice.Name === aName)
                res = aDevice;
        });

        return res;
    };

    this.getActuators = function () {
        var res = [];

        this.devices.forEach(function (aDevice) {
            if (aDevice instanceof BaseActuator)
                res.push(aDevice);
        });

        return res;
    };

    this.getSensors = function () {
        var res = [];

        this.devices.forEach(function (aDevice) {
            if (aDevice instanceof BaseSensor)
                res.push(aDevice);
        });

        return res;
    };

    this.getRoomById = function (aId) {
        var res = null;
        this.rooms.forEach(function (aRoom) {
            if (aRoom.Id === aId)
                res = aRoom;
        });

        return res;
    };

    this.init = function (callback) {
        that.updateDeviceList(function () {
            that.updateLogicalDeviceStates(function () {
                that.subscribeToNotifications();

                if (!that.isInitialized)
                    that.emit("InitCompleted", that);

                that.isInitialized = true;

                if (callback)
                    callback();
            });
        });
    };

    this.loginAndInit = function (username, password, callback) {
        that.login(username, password, function (res, error) {
            if (res) {
                that.init(function () {
                    if (callback)
                        callback(res);
                })
            } else if (callback) {
                callback(res, error);
            }
        });
    };

    this.shutdown = function(callback) {
        _shutdown = true;

        if (_deviceUpdateTimer)
            clearTimeout(_deviceUpdateTimer);

        that.logout(function() {
            if (callback)
                callback();
        });
    };
};

util.inherits(smarthome, EventEmitter);

module.exports = smarthome;