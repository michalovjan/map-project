import * as ol from "ol";
import {Style, Fill, Stroke, Circle, Icon} from 'ol/style';
import {register} from 'ol/proj/proj4';
import {fromLonLat} from 'ol/proj'
import * as olSource from 'ol/source';
import {GeoJSON} from 'ol/format';
import * as olLayer from 'ol/layer'
import * as olControl from 'ol/control';
import proj4 from 'proj4';
import './style.css';
import 'ol/ol.css';

proj4.defs("EPSG:5514","+proj=krovak +lat_0=49.5 +lon_0=24.83333333333333 +alpha=30.28813972222222 +k=0.9999 +x_0=0 +y_0=0 +ellps=bessel +towgs84=589,76,480,0,0,0,0 +units=m +no_defs");
register(proj4);

var notLoadedFeatures = 3;
var golemioApiKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Iml2YW52YW5hdEBnbWFpbC5jb20iLCJpZCI6MjkyLCJuYW1lIjpudWxsLCJzdXJuYW1lIjpudWxsLCJpYXQiOjE1OTA4NTkwMjgsImV4cCI6MTE1OTA4NTkwMjgsImlzcyI6ImdvbGVtaW8iLCJqdGkiOiJhNTI0ZWI5Yi04ZmI5LTQzZWMtYWQwNC1lZDcxOGI3ZmRhYWYifQ.NMm5_7uI1IGmdI96cRux7GUraa8OMUlNCyZv2jAuM54';
var styles = {
'Polygon': new Style({
    stroke: new Stroke({
        color: 'red',
        width: 1
    }),
    fill: new Fill({
        color: 'rgba(255, 0, 0, 0.2)'
    })
}),
'Circle': new Style({
    stroke: new Stroke({
        color: 'red',
        width: 2
    }),
    fill: new Fill({
        color: 'rgba(255,0,0,0.2)'
    })
})};

var noiseStyle = new Style({
    stroke: new Stroke({
        color: 'red',
        width: 1
    }),
    fill: new Fill({
        color: 'rgba(255, 0, 0, 0.2)'
    })
});

var metroColors = {
    'A': ['green', 'rgba(0, 255, 0, 0.2)'],
    'B': ['yellow', 'rgba(255, 255, 0, 0.2)'],
    'C': ['red', 'rgba(255, 0, 0, 0.2)'],
    'multi': ['blue', 'rgba(0, 0, 255, 0.2)']
};

document.getElementById('radonToggleButton').addEventListener('click', function(e) {
    toggleVisibilityClass(e.target);
    radonVectorLayer.setVisible(!radonVectorLayer.getVisible());
});

document.getElementById('metroToggleButton').addEventListener('click', function(e) {
    toggleVisibilityClass(e.target);
    metroVectorLayer.setVisible(!metroVectorLayer.getVisible());
});

document.getElementById('chmiToggleButton').addEventListener('click', function(e) {
    toggleVisibilityClass(e.target);
    chmuVectorLayer.setVisible(!chmuVectorLayer.getVisible());
});

document.getElementById('rnIndexRange').addEventListener('input', function(e) {
    document.getElementById('radonIndexText').innerHTML = e.target.value;
    radonVectorLayer.getSource().changed();
});

document.getElementById('metroRange').addEventListener('input', function(e) {
    document.getElementById('metroRadiusText').innerHTML = e.target.value;
    metroVectorLayer.getSource().changed();
});

document.querySelectorAll('.downloadButton').forEach(function (button) {
    button.addEventListener('click', noiseDownloadEventHandler);
});

document.getElementById('noiseSlider').addEventListener('input', function(e) {
    var val = e.target.value;
    e.target.title = 'Showing range of ' + e.target.value + '-' + Math.min((Number(e.target.value) + 9), 85) + ' db';
});

var slideSetter = {
    'FIRST': 0,
    'SECOND': 1,
    'THIRD': 2,
    'FOURTH': 3
}

function noiseDownloadEventHandler(e) {
    document.getElementById(e.target.id + 'loader').style.display = 'inline-block';
    e.target.disabled = true;
    e.target.innerHTML = 'Downloading data...';
    document.getElementById('noiseSlider').value = slideSetter[e.target.id] * 20;
    document.getElementById('noiseSlider').disabled = true;
    var event = document.createEvent('Event');
    event.initEvent('input', true, true);
    document.getElementById('noiseSlider').dispatchEvent(event);
    getNthLayer(e.target.id, e.target);
}

function toggleVisibilityClass(button) {
    button.classList.toggle('hide');
    button.classList.toggle('show');
}

document.getElementById('metroRadiusText').innerHTML = document.getElementById('metroRange').value;
document.getElementById('radonIndexText').innerHTML = document.getElementById('rnIndexRange').value;

var radonStyleFunction = function(feature) {
    if (feature.get('RN_INDEX') >= Number(document.getElementById('rnIndexRange').value)) {
        return styles[feature.getGeometry().getType()];
    }
};

var metroStyleFunction = function(feature, resolution) {
    var line = feature.get('VST_LINKA');
    var stationColor = line.length > 1 ? metroColors['multi'] : metroColors[line];
    return new Style({
        image: new Circle({
            radius: Number(document.getElementById('metroRange').value) / resolution,
            fill: new Fill({color: stationColor[1]}),
            stroke: new Stroke({
                color: stationColor[0],
                width: 1
            })
        })
    });
};

var chmuStyleFunction = function(feature, resolution) {
    var aqIndex = Number(feature.get('measurement').AQ_hourly_index);
    return new Style({
        image: new Icon({
            src: 'https://api.iconify.design/oi:cloud.svg?color=' + getColor(aqIndex / 7) + '&height=15'
        })
    });
};

var noiseStyleFunction = function(feature, resolution) {
    var sliderVal = Number(document.getElementById('noiseSlider').value);
    var featureLoVal = Number(feature.get('DB_LO'));
    var featureHiVal = Number(feature.get('DB_HI'));
    if (featureLoVal >= sliderVal && featureHiVal < sliderVal + 10) {
        noiseStyle.setGeometry(feature.getGeometry().simplify(2.8 * resolution));
        noiseStyle.getFill().setColor(getColor(feature.get('DB_LO') / 85, 0.1));
        noiseStyle.getStroke().setColor(getColor(feature.get('DB_LO') / 85, 0.2));
        return noiseStyle;
    }
};

var chmuVectorSource = new olSource.Vector({
    format: new GeoJSON(),
    loader: chmuLoader
});

var chmuVectorLayer = new olLayer.Vector({
    source: chmuVectorSource,
    style: chmuStyleFunction
});

var metroVectorSource = new olSource.Vector({
    url: 'http://192.168.0.116:8080/metrosFiltered.json',
    format: new GeoJSON()
});

var metroVectorLayer = new olLayer.Vector({
    source: metroVectorSource,
    style: metroStyleFunction
});		

var radonVectorSource = new olSource.Vector({
    url: 'http://192.168.0.116:8080/GEO_RN_IndexPlochy_p.json',
    format: new GeoJSON()
});	

var radonVectorLayer = new olLayer.Vector({
    source: radonVectorSource,
    style: radonStyleFunction
});

var container = document.getElementById('popup');
var content = document.getElementById('popup-content');

var overlay = new ol.Overlay({
    element: container
});		

var map = new ol.Map({
    layers: [
        new olLayer.Tile({
            source: new olSource.OSM({
                "url" : "http://{a-c}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png"
            })
        }),
        radonVectorLayer,
        metroVectorLayer,
        chmuVectorLayer        
    ],
    target: 'map',
    overlays: [overlay],
    view: new ol.View({
        center: fromLonLat([14.4229888, 50.0923933]),
        zoom: 11
    })
});		

map.on('pointermove', function(e) { 
    showInfo(e.coordinate); 
});

var loader = document.createElement('div');
loader.className = 'loader';
var loaderContainer = document.createElement('div');
loaderContainer.className = 'ol-control-panel ol-unselectable ol-control';
loaderContainer.id = 'loaderContainer';
loaderContainer.title = 'On purpose';
loaderContainer.appendChild(loader);

var loaderControl = new olControl.Control({
    element: loaderContainer
});

map.addControl(loaderControl);

radonVectorLayer.once('postrender', postRenderFunction);

metroVectorLayer.once('postrender', postRenderFunction);

chmuVectorLayer.once('postrender', postRenderFunction);

function postRenderFunction() {
    notLoadedFeatures--;
    if (!notLoadedFeatures) {
        map.removeControl(loaderControl);
    }
}

function showInfo(coordinate) {
    var features = map.getFeaturesAtPixel(map.getPixelFromCoordinate(coordinate), {
        hitTolerance: 2
    });
    if (!features.length) {
        overlay.setPosition(undefined);
        return;
    }
    var feature = features[0];
    var text = getTooltipText(feature);
    if (!text) {
        overlay.setPosition(undefined);
        return;
    }
    content.innerHTML = '<span class="popup-text">' + text + '</span>';
    overlay.setPosition(coordinate);
}

function getTooltipText(feature) {
    var val = feature.get('RN_INDEX');
    if (val) {
        return 'Area with radon index of ' + val;
    }
    val = feature.get('UZEL_NAZEV');
    if (val) {
        return document.getElementById('metroRange').value + 'm vicinity of ' + val + ' station.';
    }
    val = feature.get('measurement');
    if (val) {
        val = val.AQ_hourly_index;
        return 'CHMI station: ' + feature.get('name') + '<br>Air quality index: ' + val + '<br>Air quality: ' + getAirQualityDescription(val);
    }
}

function chmuLoader(extent, resolution, projection) {
    var proj = projection.getCode();
    var url = 'https://api.golemio.cz/v2/airqualitystations/?latlng=50.124935%2C14.457204&range=15000';
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('x-access-token', golemioApiKey);
    xhr.setRequestHeader('Content-Type', 'application/json; charset=utf-8');
    var onError = function() {
        chmuVectorSource.removeLoadedExtent(extent);
    };
    xhr.onerror = onError;
    xhr.onload = function() {
        if (xhr.status == 200) {
            var jsonObj = JSON.parse(xhr.responseText);
            jsonObj['features'].forEach(function(item) {
                item.geometry.coordinates = fromLonLat(item.geometry.coordinates);
            });
            chmuVectorSource.addFeatures(
                chmuVectorSource.getFormat().readFeatures(JSON.stringify(jsonObj)));
        } else {
            onError();
        }
    };
    xhr.send();
}

function getNthLayer(layer, button) {
    console.log(layer);
    var vectorSource = new olSource.Vector({
        url: 'http://192.168.0.116:8080/' + layer + '_MIN.json',
        format: new GeoJSON()
    });
    
    var vectorLayer = new olLayer.Vector({
        source: vectorSource,
        style: noiseStyleFunction
    });
    var layers = map.getLayers();
    layers.insertAt(1, vectorLayer);

    vectorLayer.once('change', function(e) { 
        button.disabled = false;
        button.innerHTML = '';
        button.classList.remove('downloadButton');
        button.classList.add('hide');

        document.getElementById('noiseSlider').style.display = 'inline-block';
        document.getElementById('noiseSlider').disabled = false;
        document.getElementById(layer + 'loader').style.display = 'none';

        document.getElementById('noiseSlider').addEventListener('input', function() {
            e.target.getSource().changed();
        });

        button.removeEventListener('click', noiseDownloadEventHandler);
        button.addEventListener('click', function(event) {
            toggleVisibilityClass(event.target);
            e.target.setVisible(!e.target.getVisible());            
        });
    });
}

function getColor(value, alpha = 1) {
    var hue = ((1 - value) * 120).toString(10);
    return 'hsl(' + hue + ',100%,50%,' + alpha + ')';
}

function getAirQualityDescription(aqIndex) {
    switch (aqIndex) {
        case 0:
        case 1:
            return 'very good';
        case 2:
            return 'good';
        case 3:
        case 4:
            return 'acceptable';
        case 5:
            return 'aggravated';
        case 6:
            return 'bad';
        default:
            return 'uknknown';
    }
}