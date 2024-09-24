
import Map from '@arcgis/core/Map.js';
import MapView from '@arcgis/core/views/MapView.js';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer.js';
import SimpleLineSymbol from '@arcgis/core/symbols/SimpleLineSymbol';
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol';
import Legend from '@arcgis/core/widgets/Legend.js';
import ClassBreaksRenderer from "@arcgis/core/renderers/ClassBreaksRenderer";

import layerAttributes from './layerAttributes';
import { formatNumber } from './formatters';


async function getAllFeatures(layer, attribute) {
  const query = layer.createQuery();
  query.outFields = [attribute]; // Retrieve all fields
  query.returnGeometry = true; // Include geometry
  query.where = `${attribute} IS NOT NULL AND ${attribute} >= 0`;

  try {
    const response = await layer.queryFeatures(query);
    const allFeatures = response.features;
    console.log(`Feature count: ${allFeatures.length}`);
    console.log(allFeatures[0]);
    return allFeatures;
  } catch (error) {
    console.error("Error fetching features:", error);
  }
}

const getClassBreakRanges = async (layer, fieldName) => {
  const values = (await getAllFeatures(layer, fieldName)).map(feature => feature.attributes[fieldName]);
  values.sort();
  const median = values[values.length/2];
  const fieldLabel = layerAttributes[fieldName];

  const stats = await getStats(layer, fieldName);
  stats.median = median > 100 ? median : 100;

  let rounder;
  if (stats.median > 5000) {
    rounder = 1000;
  } else if (stats.median < 5000 && stats.median > 1000) {
    rounder = 100;
  } else if (stats.median <= 1000) {
    rounder = 10;
  } else if (stats.median <= 100) {
    rounder = 0;
  }

  const lowMin = 0;
  const lowMax = stats.median/2 - (rounder ? ((stats.median/2) % rounder) : 0);
  const medMin = lowMax+1;
  const medMax = stats.median - (rounder ? stats.median % rounder : 0);
  const highMin = medMax + 1;
  const highMax = medMax + (stats.stddev - (rounder ? stats.stddev % rounder : 0));
  const veryHighMin = highMax+1;
  const veryHighMax = stats.max;

  console.log(`
    median: ${stats.median}
    lowMax: ${lowMax}
    medMax: ${medMax}
    highMax: ${highMax}
    veryHighMax: ${veryHighMax}
    stddev: ${stats.stddev}
    rounder: ${rounder}
  `);

  const result = {
    low: {
      label: `Low (${formatNumber(fieldLabel, lowMin)} - ${formatNumber(fieldLabel, lowMax)})`,
      min: lowMin,
      max: lowMax,
    },
    med: {
      label: `Moderate (${formatNumber(fieldLabel, medMin)} - ${formatNumber(fieldLabel, medMax)})`,
      min: medMin,
      max: medMax,
    },
    high: {
      label: `High (${formatNumber(fieldLabel, highMin)} - ${formatNumber(fieldLabel, highMax)})`,
      min: highMin,
      max: highMax,
    },
    veryHigh: {
      label: `Very High (${formatNumber(fieldLabel, veryHighMin)} - ${formatNumber(fieldLabel, veryHighMax)})`,
      min: veryHighMin,
      max: veryHighMax,
    }
  }
  
  console.log(result);

  return result;

}

// Define the query to get min and max of an attribute
const getStats = async (featureLayer, attribute) => {
  const query = featureLayer.createQuery();
  query.outStatistics = [
    {
      onStatisticField: attribute,
      outStatisticFieldName: "stddev_value",
      statisticType: "stddev"
    },
    {
      onStatisticField: attribute,
      outStatisticFieldName: "max_value",
      statisticType: "max"
    },
  ];

  query.where = `${attribute} IS NOT NULL AND ${attribute} >= 0`;

  // Execute the query to get the result
  const result = await featureLayer.queryFeatures(query);

  if (result.features.length > 0) {
    const stddev = result.features[0].attributes.stddev_value;
    const max = result.features[0].attributes.max_value;
    const min = result.features[0].attributes.min_value;
    return {
      stddev: stddev,
      max: max,
      min: min,
    }
  }
};

// Function to create the ClassBreaksRenderer based on the numeric attribute
export const getRenderer = async (layer, fieldName) => {
  const classInfo = await getClassBreakRanges(layer, fieldName);
  return new ClassBreaksRenderer({
    field: fieldName, // The numeric field for classification
    classBreakInfos: [
      {
        minValue: 0,
        maxValue: classInfo.low.max,
        symbol: new SimpleFillSymbol({
          color: [255, 255, 204, 0.7], // Light yellow fill
          outline: new SimpleLineSymbol({
            color: [0, 0, 0, 1],
            width: 1
          })
        }),
        label: classInfo.low.label,
      },
      {
        minValue: classInfo.med.min,
        maxValue: classInfo.med.max,
        symbol: new SimpleFillSymbol({
          color: [161, 218, 180, 0.7], // Light green fill
          outline: new SimpleLineSymbol({
            color: [0, 0, 0, 1],
            width: 1
          })
        }),
        label: classInfo.med.label
      },
      {
        minValue: classInfo.high.min,
        maxValue: classInfo.high.max,
        symbol: new SimpleFillSymbol({
          color: [65, 182, 196, 0.7], // Blue-green fill
          outline: new SimpleLineSymbol({
            color: [0, 0, 0, 1],
            width: 1
          })
        }),
        label: classInfo.high.label,
      },
      {
        minValue: classInfo.veryHigh.min,
        maxValue: 100000000000,
        symbol: new SimpleFillSymbol({
          color: [44, 127, 184, 0.7], // Dark blue fill
          outline: new SimpleLineSymbol({
            color: [0, 0, 0, 1],
            width: 1
          })
        }),
        label: classInfo.veryHigh.label
      }
    ],
    // Special case handling for null, -999, or any other invalid value
    defaultSymbol: new SimpleFillSymbol({
      color: [255, 0, 0, 0.5], // Transparent red fill for invalid data
      outline: new SimpleLineSymbol({
        color: [255, 255, 255, 1], // Red outline for null or invalid values
        width: 1
      })
    }),
    defaultLabel: 'No Data',
  });
};

const map = new Map({
  basemap: 'topo-vector',
});

export function makeMap(mapRef) {

  const view = new MapView({
    container: mapRef.current,
    map: map,
    center: [-98.5795, 39.8283],
    zoom: 4,
  });

  view.ui.add(
    new Legend({
      view: view,
    }),
    'top-right'
  );

  return view;

}

export async function addCensusLayer () {

  // USDA Census Layer
  const usdaCensusLayer = new FeatureLayer({
    url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/USDA_Census_of_Agriculture_2022_All/FeatureServer/0',
    outFields: ['*'],
    opacity: 0.8,
  });

  usdaCensusLayer.renderer = await getRenderer(usdaCensusLayer, 'POPULATION');

  map.add(usdaCensusLayer);
  
  return usdaCensusLayer;
}