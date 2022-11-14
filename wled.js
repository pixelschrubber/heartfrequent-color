const axios = require('axios').default;

// format the data according to wled json object
const formatData = (data, config) => {
  /*
  0-1: FTMS flags field
  2: Stroke rate in SPM*2
  3-4: Stroke count
  5-7: Distance in meters
  8-9: Actual split time in seconds
  10-11: Average split time in seconds
  12-13: Actual power in watts
  14-15: Average power in watts
  16 (optional): Current heartrate in BPM
  17-18: Current workout time in seconds
  */

  // The presence of the conditional fields is dependent on the Flags field value. - data[0] or data[1]
  // fallback config with some nice palette and effect
  let formatdata = {"on":true, "seg": [{ "fx": 0, "pal": 0 }] };

  switch (config.type) {
    case 'Heartrate':
      if (data[16] !== undefined) {
        // Present if bit 9 of Flags field set to 1 - data[16] is heartrate
        const colorDataSet = filterData(data[16], colors);
        const rgb = colorDataSet.rgb.split(',');
        console.log("Color: " + colorDataSet.color);

        formatdata = {"on":true,  "seg": [{ "start": 0, "stop": 225, "col": [[parseInt(rgb[0]),parseInt(rgb[1]),parseInt(rgb[2])]], "fx": config.fx, "pal": 0 }] };
      }
      break;

    case 'Power':
      if (data[12] !== undefined) {
        const powerDataSet = filterData(data[12], power);

        // Present if bit 5 of Flags field set to 1 - data[12] is generated watt
        const rgb = powerDataSet.rgb.split(',');
        console.log("Color: " + powerDataSet.color);
        
        formatdata = {"on":true,  "seg": [{ "start": 0, "stop": 225, "col": [[parseInt(rgb[0]),parseInt(rgb[1]),parseInt(rgb[2])]], "fx": config.fx, "pal": 0 }] };
      }
      break;

    case 'Running':
      if (data[12] !== undefined) {
        //@todo: light should "walk" while pulling - https://kno.wled.ge/features/effects-palettes/ running effect?
        // Present if bit 5 of Flags field set to 1 - data[12] is generated watt  
        const runningDataSet = filterData(data[12], power);

        // my segments: 30 leds (1-30), 45 leds (30-75), 30 leds (75-105), 60 leds (105-165), 60 leds (165-225)
        let length = Math.round(runningDataSet.percent * 60 / 100);
        console.log("How many LEDs? " + length)
        // fx 15?
        formatdata = {"on":true, "seg":[{"start":0,"stop":30,"fx":0,"col":[[255,0,204]],"sel":true},{"start":30,"stop":75,"len":45,"fx":76,"sx":127,"ix":127,"pal":9,"sel":true},{"start":75,"stop":105,"fx":0,"col":[[255,0,204]],"sel":true},{"start":105,"stop":165,"len":length,"fx":76,"sx":127,"ix":127,"pal":9,"sel":true},{"start":165,"stop":225,"len":length,"fx":76,"sx":127,"ix":127,"pal":9,"sel":true,"rev":true}]};
      }
      break;

    default:
      // formatdata will be used as default
      break;
  }
  return JSON.stringify(formatdata);
}

const filterData = (data, dataset) => {
  const range = d => d.max >= data && d.min <= data;
  const filteredDataSet = dataset.filter(range)[0];
  return filteredDataSet;
}

const wled = (data, config, callback) => {

  console.log("Heartrate: 💓" + data[16]);
  console.log("Flag 1: " + data[0] + " + Flag 2: " + data[1]);
  console.log("Power 12: " + data[12] + " + Power 13: " + data[13]);

  // bluetooth bit array to json
  let formattedData = formatData(data, config);

  // https://kno.wled.ge/interfaces/json-api/
  // change address, which was assigned to the Esp8266 Microcontroller via dhcp, mDNS is adding 5s lag
  var axiosConfig = {
    method: 'post',
    url: 'http://'+config.ip+'/json/state',
    headers: {
      'Content-Type': 'application/json'
    },
    data: formattedData
  };

  axios(axiosConfig)
    .then(function (response) {
      //console.log(JSON.stringify(response.data));
      callback(undefined, response)
    })
    .catch(function (error) {
      //console.log(error);
      callback(error, undefined)
    });
}


// *HFmax = Maximale Herzfrequenz (220-Lebensalter). Beispiel: 30 Jahre alt, 220 – 30 = 190 S/min.
// https://support.polar.com/e_manuals/Team_Pro/Polar_Team_Pro_user_manual_Deutsch/Content/Polar_Heart_Rate_Zones.htm
let colors = [
  {
    color: 'gray',
    rgb: '255,255,255',
    minpercent: 50,
    maxpercent: 60,
    min: 0,
    max: 114
  },
  {
    color: 'blue',
    rgb: '41,141,255',
    minpercent: 60,
    maxpercent: 70,
    min: 115,
    max: 133
  },
  {
    color: 'green',
    rgb: '20,255,28',
    minpercent: 70,
    maxpercent: 80,
    min: 134,
    max: 152
  },
  {
    color: 'yellow',
    rgb: '255,200,0',
    minpercent: 80,
    maxpercent: 90,
    min: 153,
    max: 172
  },  
  {
    color: 'red',
    rgb: '255,0,0',
    minpercent: 90,
    maxpercent: 100,
    min: 173,
    max: 190
  }
];

/* inspired by wrx 1000 */
let power = [{
  color: 'blue',
  rgb: '41,141,255',
  min: 0,
  max: 100,
  percent: 14
},
{
  color: 'aqua',
  rgb: '0,255,200',
  min: 101,
  max: 150,
  percent: 28
},
{
  color: 'green',
  rgb: '20,255,28',
  min: 151,
  max: 200,
  percent: 42
},
{
  color: 'yellow',
  rgb: '255,200,0',
  min: 201,
  max: 250,
  percent: 56
},
{
  color: 'orange',
  rgb: '255,128,0',
  min: 251,
  max: 300,
  percent: 70
},
{
  color: 'red',
  rgb: '255,0,0',
  min: 301,
  max: 350,
  percent: 84
},
{
  color: 'magenta',
  rgb: '255,0,204',
  min: 350,
  max: 1000,
  percent: 100
}
];

module.exports = wled