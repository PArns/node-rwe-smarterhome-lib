# RWE-SmarterHome Lib
RWE-SmarterHome is a Node.JS library for the RWE-SmartHome which directly communicates with the SmartHome central.

```JavaScript
    var sh = require("./lib/smarthome");
    var smartHome = new sh("192.168.1.17");
    var DO_EXIT = false;
    
    smartHome.login("USERNAME", "PASSWORD", function (res, error) {
        if (res) {
            console.log("LOGIN COMPLETE");
    
            smartHome.init(function () {
                console.log("INIT COMPLETE");
    
                var devices = smartHome.devices;
    
                devices.forEach(function (device) {
                    console.log(device.Name + " (" + device.Id + ", " + device.Type + "): " + device.getFriendlyState());
                });
    
                var p = smartHome.getDeviceByName("Test");
                
                if (p)
                    p.setState(true);
    
            });
    
            smartHome.on("StatusChanged", function (device) {
                console.log("DEVICE STATUS CHANGED", device.Name, device.getFriendlyState());
            });
        } else {
            console.log("LOGIN ERROR", error);
        }
    });
    
    (function wait() {
        if (!DO_EXIT) setTimeout(wait, 1000);
    })();
```
