
import { Box, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { getRenderer, makeMap, addCensusLayer } from './map';
import FullPageSpinner from './LoadSpinner';
import { formatNumber } from './formatters.js';

import layerAttributes from './layerAttributes';
const layerAttrKeys = Object.keys(layerAttributes);

const toFilterKeys = [
  'OBJECTID',
  'NAME',
  'GEOID',
  'STATE_NAME',
  'STATE_ABBR',
  'STATE_FIPS',
  'COUNTY_FIPS',
  'Shape__Area',
  'Shape__Length',
];

const setupOnFeatureClick = async (mapView, layerView, highlight, setHighlight, setFeatureInfo) => {
  // Add click event listener to the map
  mapView.on("click", async (event) => {
    // Clear previous highlight if exists
    if (highlight) {
      highlight.remove();
    }

    // Perform a hit test to find the feature that was clicked
    const response = await mapView.hitTest(event);
    const results = response.results;

    console.log('Checking for intersected features');

    if (results.length > 0 && results[0].graphic && results[0].graphic.layer) {
      const graphic = results[0].graphic;
      console.log(`Found feature:`);
      console.log(graphic.attributes);
      setFeatureInfo(graphic.attributes);

      // Highlight the feature
      highlight = layerView.highlight(graphic);
      // Set the new highlight state
      setHighlight(highlight);
      console.log('Finished setting up onFeatureClick');
    } else {
      console.log('No feature found on click');
      setFeatureInfo(null);
    }
  });
}

const onSearch = (e, setSearchedAttrs, setSearchTerm) => {
  const searchTermNew = e.target.value;
  setSearchTerm(searchTermNew);
  console.log(searchTermNew);
  setSearchedAttrs(layerAttrKeys.filter(key => {
    const val = layerAttributes[key];
    return layerAttributes[key].toLowerCase().includes(searchTermNew.toLowerCase());
  }));
}


function FeatureInfoBox({ featureInfo, searchedAttrs, setSearchedAttrs, renderAttr, setRenderAttr, searchTerm, setSearchTerm }) {
  if (featureInfo === 'loading') {
    return <FullPageSpinner />
  } else if (featureInfo === null || featureInfo === undefined) {
    return <Box>Click on a county on the map, you fool!</Box>
  } else {

    const keys = Object.keys(featureInfo).filter(key => {
      const base = !toFilterKeys.includes(key);
      if (!searchedAttrs) {
        return base;
      } else {
        return base && searchedAttrs.includes(key)
      }
    });

    const boxes = keys.map((key, index) => {
      return <Stack direction="row" key={ `stack_${index}`}
        sx={{
          bgcolor: renderAttr === key ? 'lightblue' : 'inherit',
          p: 2,
          borderLeft: '.5px solid black',
          borderRight: '.5px solid black',
          borderTop: '.5px solid black',
          borderBottom: `${index === keys.length-1 ? '.5px' : 0} solid black`
        }}
        onClick={ async e => {
          console.log('Setting renderer from click...');
          setRenderAttr(key);
        }}
      >
        <Box
          key={ `key_${index}` }
          sx={{
            width: '70%',
            pr: 2,
            borderRight: '.5px solid black'
          }}
        >{ layerAttributes[key] }</Box>
        <Box
          key={ `val_${index}` }
          sx={{
            width: '30%',
            textAlign: 'right',
          }}
        >{ formatNumber(layerAttributes[key], featureInfo[key]) }</Box>
      </Stack>
    });
    return [
      // County/State
      <Typography
        key="county_state_heading" pt={1} pb={1} variant="h5">{ featureInfo.NAME }, { featureInfo.STATE_NAME }</Typography>,
      <TextField key="search" onChange={ e => onSearch(e, setSearchedAttrs, setSearchTerm ) } variant="outlined" label="Filter Attributes" sx={{ width: '100%', pb: 2, }}>{ searchTerm }</TextField>,
      // attribute data
      <Box sx={{ overflowY: 'scroll', height: 'inherit', }} key="attrs">{ boxes }</Box>
    ];
  }
}

export default function App () {

  const mapRef = useRef(null);
  // set up the map and listeners
  const [ highlight, setHighlight ] = useState(null);
  const [ featureInfo, setFeatureInfo ] = useState(null);
  const [ searchedAttrs, setSearchedAttrs ] = useState(null);
  const [ renderAttr, setRenderAttr ] = useState('POPULATION');
  const [ layer, setLayer ] = useState(null);
  const [ searchTerm, setSearchTerm ] = useState('');
  const [ loading, setLoading ] = useState(true);

  useEffect(function () {
    async function setRenderer() {
      setLoading(true);
      console.log(`Changing renderer to key ${renderAttr}...`)
      if (layer) {
        layer.renderer = await getRenderer(layer, renderAttr);
        layer.refresh();
      } else {
        console.log('No layer found');
      }
      console.log('Finished changing renderer.');
      setLoading(false);
    }
    setRenderer();
  }, [renderAttr])

  useEffect(function () {
    async function mapSetupEffect() {
      console.log('Loading...');
      setLoading(true);
      const mapView = makeMap(mapRef);
      const layer = await addCensusLayer();
      setLayer(layer);
      mapView.whenLayerView(layer).then(lv => {
        const layerView = lv;
        setupOnFeatureClick(
          mapView,
          layerView,
          highlight,
          setHighlight,
          setFeatureInfo,
        );
        console.log('Loading complete.');
        setLoading(false);
      })
    }
    mapSetupEffect();
  }, [mapRef]);

  return <Stack
    direction="row"
    style={{
      height: '95vh',
      width: '100vw',
      paddingBottom: 0,
      fontFamily: 'sans-serif',
    }}
  >
    { /* info panel */ }
    <Box
      key="panel"
      sx={{
        width: '25%',
        height: '100%',
        pl: 2,
        pr: 2,
        pt: 2,
      }}>
      <Typography key="usdaCensusTitle" variant="h4">USDA Census</Typography>
      <FeatureInfoBox
        key="featureInfoBox"
        featureInfo={ featureInfo }
        searchedAttrs={ searchedAttrs }
        setSearchedAttrs={ setSearchedAttrs }
        renderAttr={ renderAttr }
        setRenderAttr={ setRenderAttr }
        searchTerm={ searchTerm }
        setSearchTerm={ setSearchTerm }
       />
    </Box>
    <div
      style={{
        width: '70vw',
        height: '95vh',
        position: 'relative',
      }}
    >
      { loading && <FullPageSpinner /> }
      <div
        key="map"
        ref={mapRef}
        style={{
          padding: 0,
          margin: 0,
          height: '100%',
          width: '100%',
        }}
      />
    </div>
  </Stack>
}