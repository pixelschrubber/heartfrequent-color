const noble = require('@abandonware/noble')
const wled = require('./wled')

const connectToSmartrow = () => {
    // @todo: make config adjustable in a webinterface and save to config.json
    // fx: https://kno.wled.ge/features/effects-palettes/
    // dns-sd -Gv4v6 glow-row.local
    let config = {type:'Running', fx: 0, segments: 'all', strokebased: true, ip: '192.168.1.46'};

    noble.on('stateChange', async (state) => {
        if (state === 'poweredOn') {
            noble.startScanning([], true); // any service UUID, allow duplicates
            // https://gist.github.com/sam016/4abe921b5a9ee27f67b3686910293026
            await noble.startScanningAsync(['1826'], false);
        }
    });

    noble.on('discover', function (peripheral) {
        // Once peripheral is discovered, stop scanning
        noble.stopScanning();

        // connect to the heart rate sensor
        peripheral.connect(function (error) {

            // Bluetooth Service 1826 for Fitness Machine (FTMS)
            var serviceUUID = ["1826"];

            // Rower data
            var characteristicUUID = ["2AD1"];

            // https://github.com/gamma/FTMS-Bluetooth/blob/master/Sources/FTMS%20Bluetooth/FTMSUUIDs.swift
            // There might be more? 2A63, 2A64, 2A65, 2ACE
            // https://btprodspecificationrefs.blob.core.windows.net/assigned-values/16-bit%20UUID%20Numbers%20Document.pdf

            // use noble's discoverSomeServicesAndCharacteristics
            peripheral.discoverSomeServicesAndCharacteristics(serviceUUID, characteristicUUID, function (error, services, characteristics) {
                characteristics[0].notify(true, function (error) {
                    console.log("Rower connected 🚣");
                    let strokes = 0;

                    characteristics[0].on('data', function (data, isNotification) {
                        console.log("Receiving data from smartrow 😅");

                        // data is being received more often than the actual strokes being done, 
                        // this way the LEDs may be changed only once per stroke
                        if(config.strokebased) {
                            if(data[3] !== undefined && strokes !== data[3]) {
                                // call wled api
                                wled(data, config, (error, response) => {
                                    if (error) {
                                        console.log(error);
                                    }
                                    //console.log(response.config.data);
                                });
                            }
                            strokes = data[3];
                        } else {
                            // Upon receiving data, output to LEDs, buffer here?
                            wled(data, config, (error, response) => {
                                if (error) {
                                    console.log(error);
                                }
                                //console.log(response.config.data);
                            });
                        }
                    });
                });
            });
        });
    });
}

connectToSmartrow()
