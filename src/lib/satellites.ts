// Copyright 2026 Kushan J
// SPDX-License-Identifier: Apache-2.0

// Satellite layer catalog — real OGC WMS endpoints from NASA GIBS, NOAA, GEBCO, EOX, and others.
// Every URL has been verified to respond to GetCapabilities requests.
// Coverage field tells users which geographic regions each layer covers.
// suggestedBbox provides recommended coordinates for optimal use.

export interface SatellitePreset {
  name: string;
  layerName: string;
  url: string;
  category: string;
  description: string;
  frequency: string;
  coverage: string;
  suggestedBbox?: string; // "lon1,lat1,lon2,lat2" — auto-fills BBOX when selected
  bboxConstraint?: "land" | "ocean" | "americas" | "us" | "any"; // helps warn if BBOX won't work
}

// ── Region Quick-Select Presets ─────────────────────────────────────────
export interface RegionPreset {
  name: string;
  bbox: string;
  emoji: string;
}

export const REGION_PRESETS: RegionPreset[] = [
  { name: "India (Full)",         bbox: "68.0, 6.0, 97.5, 37.0",    emoji: "🇮🇳" },
  { name: "Delhi NCR",            bbox: "76.5, 28.0, 77.8, 29.2",   emoji: "🏙️" },
  { name: "Mumbai Coast",         bbox: "72.0, 18.5, 73.5, 19.8",   emoji: "🌊" },
  { name: "Himalayas",            bbox: "72.0, 27.0, 90.0, 37.0",   emoji: "🏔️" },
  { name: "Punjab (Stubble)",     bbox: "73.5, 29.5, 77.5, 32.5",   emoji: "🔥" },
  { name: "Bay of Bengal",        bbox: "78.0, 5.0, 95.0, 22.0",    emoji: "🌀" },
  { name: "US West Coast",        bbox: "-124.0, 32.0, -117.0, 49.0", emoji: "🇺🇸" },
  { name: "California Fires",     bbox: "-124.0, 38.0, -120.0, 42.0", emoji: "🔥" },
  { name: "Amazon Rainforest",    bbox: "-74.0, -12.0, -50.0, 3.0", emoji: "🌿" },
  { name: "Sahara Desert",        bbox: "-10.0, 15.0, 35.0, 35.0",  emoji: "🏜️" },
  { name: "Europe",               bbox: "-10.0, 35.0, 40.0, 60.0",  emoji: "🇪🇺" },
  { name: "Arctic Ice",           bbox: "-180.0, 65.0, 180.0, 90.0", emoji: "🧊" },
  { name: "Australia Fires",      bbox: "140.0, -40.0, 155.0, -25.0", emoji: "🔥" },
  { name: "Southeast Asia",       bbox: "95.0, -10.0, 140.0, 25.0", emoji: "🌏" },
];

// ── Verified WMS Base URLs ──────────────────────────────────────────────
const GIBS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";
const GEBCO = "https://wms.gebco.net/mapserv";
const EOX = "https://tiles.maps.eox.at/wms";
const GOES_WEST = "https://mesonet.agron.iastate.edu/cgi-bin/wms/goes/west_ir.cgi";
const NEXRAD = "https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi";

export const SATELLITE_CATALOG: SatellitePreset[] = [
  // ═══ 🥇 Gold Standard (Ultra High-Res) ═══
  { name: "Landsat 8/9 (HLS 30m)",           layerName: "HLS_L30_Nadir_BRDF_Adjusted_Reflectance",     url: GIBS, category: "🥇 Ultra High-Res",  description: "30-meter high-resolution imagery from Landsat 8 & 9",        frequency: "Every 8 days", coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "Sentinel-2 (HLS 30m)",            layerName: "HLS_S30_Nadir_BRDF_Adjusted_Reflectance",     url: GIBS, category: "🥇 Ultra High-Res",  description: "30-meter high-resolution imagery from European Sentinel-2",  frequency: "Every 5 days", coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "Landsat True Color (Monthly)",    layerName: "Landsat_WELD_CorrectedReflectance_TrueColor_Global_Monthly", url: GIBS, category: "🥇 Ultra High-Res", description: "30m Landsat monthly composites — cloud-free, global", frequency: "Monthly", coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "Landsat False Color 7-4-3 (Monthly)", layerName: "Landsat_WELD_CorrectedReflectance_Bands743_Global_Monthly", url: GIBS, category: "🥇 Ultra High-Res", description: "30m Landsat false color — burn scars, vegetation, urban", frequency: "Monthly", coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "Landsat NDVI (Monthly)",          layerName: "Landsat_WELD_NDVI_Global_Monthly",             url: GIBS, category: "🥇 Ultra High-Res",  description: "30m Landsat vegetation index — higher detail than MODIS",    frequency: "Monthly", coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "Himawari-9 AHI (Asia/Pacific)",   layerName: "Himawari_AHI_Band3_Red_Visible_1km",          url: GIBS, category: "🥇 Ultra High-Res",  description: "10-minute geostationary weather for Asia and Australia",     frequency: "10 mins",      coverage: "🌏 Asia-Pac", bboxConstraint: "any", suggestedBbox: "68.0, 6.0, 97.5, 37.0" },
  { name: "SMAP Soil Moisture",              layerName: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture",    url: GIBS, category: "🥇 Ultra High-Res",  description: "Global root-zone soil moisture — drought/agriculture",       frequency: "1x/day",       coverage: "🌍 Global", bboxConstraint: "land" },

  // ═══ 🔥 Fire & Thermal ═══
  { name: "MODIS Terra Thermal Anomalies",   layerName: "MODIS_Terra_Thermal_Anomalies_All",           url: GIBS, category: "🔥 Fire & Thermal", description: "Active fire hotspots detected by MODIS Terra",                frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "MODIS Aqua Thermal Anomalies",    layerName: "MODIS_Aqua_Thermal_Anomalies_All",            url: GIBS, category: "🔥 Fire & Thermal", description: "Active fire hotspots from MODIS Aqua — afternoon overpass",   frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "VIIRS NOAA-20 Fire (375m)",       layerName: "VIIRS_NOAA20_Thermal_Anomalies_375m_All",     url: GIBS, category: "🔥 Fire & Thermal", description: "High-resolution 375m fire detection from VIIRS NOAA-20",     frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "VIIRS NOAA-21 Fire (375m)",       layerName: "VIIRS_NOAA21_Thermal_Anomalies_375m_All",     url: GIBS, category: "🔥 Fire & Thermal", description: "Latest-gen JPSS-2 375m fire detection from VIIRS NOAA-21",   frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "VIIRS SNPP Fire (375m)",          layerName: "VIIRS_SNPP_Thermal_Anomalies_375m_All",       url: GIBS, category: "🔥 Fire & Thermal", description: "Suomi NPP fire detection at 375m resolution",               frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "GOES-East Fire Temp",             layerName: "GOES-East_ABI_FireTemp",                      url: GIBS, category: "🔥 Fire & Thermal", description: "Geostationary fire temperature — 10-min updates over Americas",frequency: "~10 min",  coverage: "🌎 Americas", bboxConstraint: "americas", suggestedBbox: "-100.0, 20.0, -60.0, 50.0" },
  { name: "GOES-West Fire Temp",             layerName: "GOES-West_ABI_FireTemp",                      url: GIBS, category: "🔥 Fire & Thermal", description: "Geostationary fire temperature — Pacific/West Americas",      frequency: "~10 min",  coverage: "🌎 Americas", bboxConstraint: "americas", suggestedBbox: "-130.0, 20.0, -100.0, 55.0" },
  { name: "Land Surface Temp (Day)",         layerName: "MODIS_Terra_Land_Surface_Temp_Day",           url: GIBS, category: "🔥 Fire & Thermal", description: "Daytime land surface temperature — urban heat islands",       frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "Land Surface Temp (Night)",       layerName: "MODIS_Terra_Land_Surface_Temp_Night",         url: GIBS, category: "🔥 Fire & Thermal", description: "Nighttime land surface temperature — heat retention",         frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "land" },

  // ═══ 🛰️ True Color ═══
  { name: "MODIS Terra True Color",          layerName: "MODIS_Terra_CorrectedReflectance_TrueColor",  url: GIBS, category: "🛰️ True Color",     description: "Daily visible-light satellite imagery — morning overpass",    frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "MODIS Aqua True Color",           layerName: "MODIS_Aqua_CorrectedReflectance_TrueColor",   url: GIBS, category: "🛰️ True Color",     description: "Daily visible-light satellite imagery — afternoon overpass",  frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "VIIRS SNPP True Color",           layerName: "VIIRS_SNPP_CorrectedReflectance_TrueColor",   url: GIBS, category: "🛰️ True Color",     description: "Higher resolution true color from Suomi NPP VIIRS",          frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "VIIRS NOAA-20 True Color",        layerName: "VIIRS_NOAA20_CorrectedReflectance_TrueColor", url: GIBS, category: "🛰️ True Color",     description: "Latest-gen true color imagery from NOAA-20 VIIRS",           frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "VIIRS NOAA-21 True Color",        layerName: "VIIRS_NOAA21_CorrectedReflectance_TrueColor", url: GIBS, category: "🛰️ True Color",     description: "Newest JPSS-2 true color imagery from NOAA-21 VIIRS",        frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "MODIS False Color (7-2-1)",       layerName: "MODIS_Terra_CorrectedReflectance_Bands721",   url: GIBS, category: "🛰️ True Color",     description: "Highlights burn scars, floods, and land use changes",        frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "Sentinel-2 Cloudless Mosaic",     layerName: "s2cloudless-2024",                           url: EOX,  category: "🛰️ True Color",     description: "Cloud-free global mosaic from ESA Sentinel-2 (static 2024)",  frequency: "Static",   coverage: "🌍 Global", bboxConstraint: "any" },

  // ═══ 🌦️ Weather ═══
  { name: "GOES-East GeoColor (GIBS)",       layerName: "GOES-East_ABI_GeoColor",                      url: GIBS,      category: "🌦️ Weather",  description: "GOES-16 geostationary GeoColor — day/night true color",      frequency: "~10 min",  coverage: "🌎 Americas", bboxConstraint: "americas", suggestedBbox: "-100.0, 15.0, -60.0, 50.0" },
  { name: "GOES-East Infrared (GIBS)",       layerName: "GOES-East_ABI_Band13_Clean_Infrared",         url: GIBS,      category: "🌦️ Weather",  description: "GOES-16 clean IR — cloud/storm structure over Americas",     frequency: "~10 min",  coverage: "🌎 Americas", bboxConstraint: "americas", suggestedBbox: "-100.0, 15.0, -60.0, 50.0" },
  { name: "GOES-East Dust",                  layerName: "GOES-East_ABI_Dust",                          url: GIBS,      category: "🌦️ Weather",  description: "Saharan Air Layer dust detection over Atlantic",             frequency: "~10 min",  coverage: "🌎 Americas", bboxConstraint: "americas", suggestedBbox: "-90.0, 10.0, -20.0, 40.0" },
  { name: "GOES-East Air Mass",              layerName: "GOES-East_ABI_Air_Mass",                      url: GIBS,      category: "🌦️ Weather",  description: "Air mass RGB — jet stream and frontal boundary tracking",    frequency: "~10 min",  coverage: "🌎 Americas", bboxConstraint: "americas", suggestedBbox: "-100.0, 15.0, -60.0, 50.0" },
  { name: "GOES-West GeoColor (GIBS)",       layerName: "GOES-West_ABI_GeoColor",                      url: GIBS,      category: "🌦️ Weather",  description: "GOES-18 geostationary GeoColor — Pacific + West Americas",   frequency: "~10 min",  coverage: "🌎 Americas", bboxConstraint: "americas", suggestedBbox: "-160.0, 15.0, -100.0, 55.0" },
  { name: "GOES-West Infrared (GIBS)",       layerName: "GOES-West_ABI_Band13_Clean_Infrared",         url: GIBS,      category: "🌦️ Weather",  description: "GOES-18 clean IR — storms, typhoons over Pacific",           frequency: "~10 min",  coverage: "🌎 Americas", bboxConstraint: "americas", suggestedBbox: "-160.0, 15.0, -100.0, 55.0" },
  { name: "GOES-West Dust",                  layerName: "GOES-West_ABI_Dust",                          url: GIBS,      category: "🌦️ Weather",  description: "Dust detection over Pacific and West Coast",                 frequency: "~10 min",  coverage: "🌎 Americas", bboxConstraint: "americas", suggestedBbox: "-140.0, 20.0, -100.0, 50.0" },
  { name: "GOES West Infrared (Iowa)",       layerName: "goes_west_ir",                                url: GOES_WEST, category: "🌦️ Weather",  description: "GOES-18 IR via Iowa State Mesonet",                          frequency: "~15 min",  coverage: "🌎 Americas", bboxConstraint: "americas", suggestedBbox: "-130.0, 20.0, -60.0, 55.0" },
  { name: "NEXRAD Radar (US)",               layerName: "nexrad-n0q-900913",                           url: NEXRAD,    category: "🌦️ Weather",  description: "Live US NEXRAD precipitation radar mosaic",                  frequency: "~5 min",   coverage: "🇺🇸 US Only", bboxConstraint: "us", suggestedBbox: "-125.0, 24.0, -66.0, 50.0" },
  { name: "Cloud Top Temp — Terra",          layerName: "MODIS_Terra_Cloud_Top_Temp_Day",              url: GIBS,      category: "🌦️ Weather",  description: "Daytime cloud-top temperature — storm intensity indicator",  frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "Cloud Top Temp — Aqua",           layerName: "MODIS_Aqua_Cloud_Top_Temp_Day",               url: GIBS,      category: "🌦️ Weather",  description: "Afternoon cloud-top temperature from MODIS Aqua",            frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "Water Vapor (5km)",               layerName: "MODIS_Terra_Water_Vapor_5km_Day",             url: GIBS,      category: "🌦️ Weather",  description: "Atmospheric water vapor concentration at 5km resolution",    frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "AIRS Surface Air Temp (Day)",     layerName: "AIRS_L2_Surface_Air_Temperature_Day",         url: GIBS,      category: "🌦️ Weather",  description: "Surface air temperature from AIRS on Aqua — global coverage",frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "IMERG Precipitation Rate",        layerName: "IMERG_Precipitation_Rate",                    url: GIBS,      category: "🌦️ Weather",  description: "GPM global precipitation — rainfall intensity worldwide",    frequency: "30 min",   coverage: "🌍 Global", bboxConstraint: "any" },

  // ═══ 🌿 Vegetation ═══
  { name: "NDVI — 8 Day Composite",          layerName: "MODIS_Terra_NDVI_8Day",                       url: GIBS, category: "🌿 Vegetation",    description: "Vegetation health index — agriculture, deforestation",       frequency: "8 days",   coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "EVI — Enhanced Vegetation",       layerName: "MODIS_Terra_EVI_8Day",                        url: GIBS, category: "🌿 Vegetation",    description: "Better than NDVI for high-biomass tropical regions",         frequency: "8 days",   coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "OPERA Disturbance Alert (HLS)",   layerName: "OPERA_L3_DIST-ALERT-HLS_Color_Index",         url: GIBS, category: "🌿 Vegetation",    description: "Land disturbance alert — deforestation, landslides, fires",  frequency: "12 days",  coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "Snow Cover — Terra",              layerName: "MODIS_Terra_NDSI_Snow_Cover",                 url: GIBS, category: "🌿 Vegetation",    description: "Daily snow/ice coverage — mountains, polar regions",         frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "Snow Cover — Aqua",               layerName: "MODIS_Aqua_NDSI_Snow_Cover",                  url: GIBS, category: "🌿 Vegetation",    description: "Afternoon snow data — complements Terra coverage",           frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "land" },

  // ═══ 🌊 Ocean ═══
  { name: "Sea Surface Temp — Terra",        layerName: "MODIS_Terra_L2_Sea_Surface_Temp_Day",         url: GIBS,  category: "🌊 Ocean",         description: "Daytime SST — Indian Ocean, Arabian Sea, Pacific",           frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "ocean" },
  { name: "Sea Surface Temp — Aqua",         layerName: "MODIS_Aqua_L2_Sea_Surface_Temp_Day",          url: GIBS,  category: "🌊 Ocean",         description: "Afternoon SST — monitors marine heatwaves",                  frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "ocean" },
  { name: "Chlorophyll-a (Phytoplankton)",   layerName: "MODIS_Aqua_L2_Chlorophyll_A",                 url: GIBS,  category: "🌊 Ocean",         description: "Ocean phytoplankton — algal blooms, productivity",           frequency: "8 days",   coverage: "🌍 Global", bboxConstraint: "ocean" },
  { name: "GEBCO Bathymetry",                layerName: "GEBCO_LATEST_2",                              url: GEBCO, category: "🌊 Ocean",         description: "Global ocean depth + land elevation at 15 arc-second",       frequency: "Static",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "GEBCO Shaded Relief",             layerName: "GEBCO_LATEST",                                url: GEBCO, category: "🌊 Ocean",         description: "3D shaded relief of global seafloor and topography",         frequency: "Static",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "OPERA Surface Water (HLS)",       layerName: "OPERA_L3_Dynamic_Surface_Water_Extent-HLS",   url: GIBS, category: "🌊 Ocean",          description: "Dynamic surface water extent — floods, reservoirs, rivers",  frequency: "12 days",  coverage: "🌍 Global", bboxConstraint: "land" },
  { name: "OPERA Surface Water (SAR)",       layerName: "OPERA_L3_Dynamic_Surface_Water_Extent-Sentinel-1", url: GIBS, category: "🌊 Ocean",     description: "Radar-based water detection — works through clouds",         frequency: "6 days",   coverage: "🌍 Global", bboxConstraint: "land" },

  // ═══ 🌙 Night ═══
  { name: "VIIRS SNPP Day/Night Band",       layerName: "VIIRS_SNPP_DayNightBand_At_Sensor_Radiance",  url: GIBS, category: "🌙 Night",          description: "Nighttime lights — city glow, gas flares, aurora",           frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "VIIRS NOAA-20 Day/Night Band",    layerName: "VIIRS_NOAA20_DayNightBand_At_Sensor_Radiance",url: GIBS, category: "🌙 Night",          description: "Latest-gen nighttime radiance from NOAA-20",                 frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "VIIRS NOAA-21 Day/Night Band",    layerName: "VIIRS_NOAA21_DayNightBand",                   url: GIBS, category: "🌙 Night",          description: "Newest JPSS-2 nighttime radiance from NOAA-21",              frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },

  // ═══ 💨 Air Quality ═══
  { name: "Aerosol Depth — Terra (3km)",     layerName: "MODIS_Terra_Aerosol_Optical_Depth_3km",       url: GIBS, category: "💨 Air Quality",    description: "Smoke, dust, pollution — visible over India, China, Sahara", frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "Aerosol Depth — Aqua (3km)",      layerName: "MODIS_Aqua_Aerosol_Optical_Depth_3km",        url: GIBS, category: "💨 Air Quality",    description: "Afternoon aerosol — Delhi/NCR pollution, dust plumes",       frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "NO₂ Pollution (OMI)",             layerName: "OMI_Nitrogen_Dioxide_Tropo_Column",           url: GIBS, category: "💨 Air Quality",    description: "Industrial/traffic NO₂ — Delhi, Shanghai visible hotspots",  frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "SO₂ Emissions (OMI)",             layerName: "OMI_Sulfur_Dioxide_Lower_Troposphere",        url: GIBS, category: "💨 Air Quality",    description: "Industrial SO₂ — thermal plants, refineries, volcanoes",     frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "UV Absorbing Aerosol (OMI)",      layerName: "OMI_Absorbing_Aerosol_Optical_Depth",         url: GIBS, category: "💨 Air Quality",    description: "UV-absorbing aerosols — biomass burning, dust storms",       frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "TROPOMI SO₂ (Sentinel-5P)",       layerName: "TROPOMI_L2_Sulfur_Dioxide_Total_Vertical_Column", url: GIBS, category: "💨 Air Quality", description: "Volcanic/industrial SO₂ from ESA TROPOMI — 7km resolution", frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "OMPS SO₂ (Suomi NPP)",            layerName: "OMPS_SO2_Lower_Troposphere",                  url: GIBS, category: "💨 Air Quality",    description: "SO₂ from OMPS nadir mapper on Suomi NPP",                   frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },
  { name: "OMPS SO₂ (NOAA-20)",              layerName: "OMPS_NOAA20_SO2_Lower_Troposphere",           url: GIBS, category: "💨 Air Quality",    description: "SO₂ from OMPS nadir mapper on NOAA-20 (JPSS-1)",            frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any" },

  // ═══ 🇮🇳 India ═══
  { name: "Aqua True Color (India overpass)", layerName: "MODIS_Aqua_CorrectedReflectance_TrueColor",  url: GIBS, category: "🇮🇳 India",         description: "Best for India — Aqua passes over India ~1:30 PM IST",       frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any", suggestedBbox: "68.0, 6.0, 97.5, 37.0" },
  { name: "Stubble Burning Detection",        layerName: "VIIRS_SNPP_Thermal_Anomalies_375m_All",      url: GIBS, category: "🇮🇳 India",         description: "Punjab/Haryana crop fire detection (Oct-Nov peak)",          frequency: "1-2x/day", coverage: "🌍 Global", bboxConstraint: "land", suggestedBbox: "73.5, 29.5, 77.5, 32.5" },
  { name: "Delhi NCR Pollution",              layerName: "MODIS_Terra_Aerosol_Optical_Depth_3km",      url: GIBS, category: "🇮🇳 India",         description: "Indo-Gangetic Plain pollution — worst in winter",            frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any", suggestedBbox: "74.0, 25.0, 82.0, 31.0" },
  { name: "Himalayan Snowpack",               layerName: "MODIS_Terra_NDSI_Snow_Cover",                url: GIBS, category: "🇮🇳 India",         description: "Himalayan snow cover monitoring",                            frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "land", suggestedBbox: "72.0, 27.0, 90.0, 37.0" },
  { name: "Indian Agriculture (NDVI)",        layerName: "MODIS_Terra_NDVI_8Day",                      url: GIBS, category: "🇮🇳 India",         description: "Crop health — Rabi/Kharif seasons",                          frequency: "8 days",   coverage: "🌍 Global", bboxConstraint: "land", suggestedBbox: "68.0, 8.0, 90.0, 37.0" },
  { name: "Indian Ocean SST",                 layerName: "MODIS_Terra_L2_Sea_Surface_Temp_Day",        url: GIBS, category: "🇮🇳 India",         description: "Arabian Sea + Bay of Bengal — cyclone monitoring",            frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "ocean", suggestedBbox: "60.0, 0.0, 95.0, 25.0" },
  { name: "India Night Lights",               layerName: "VIIRS_SNPP_DayNightBand_At_Sensor_Radiance", url: GIBS, category: "🇮🇳 India",         description: "Urbanization and electrification tracking",                  frequency: "1x/day",   coverage: "🌍 Global", bboxConstraint: "any", suggestedBbox: "68.0, 6.0, 97.5, 37.0" },
];

export const CATEGORIES = [...new Set(SATELLITE_CATALOG.map(s => s.category))];

// ── Layer Source Metadata ───────────────────────────────────────────
// Maps WMS layer name prefixes to their real satellite source and overpass info.
// All overpass times are real and based on published orbital parameters.
// Sources: NASA GIBS docs, satellite orbital element data.

export interface LayerSourceInfo {
  satellite: string;
  instrument: string;
  orbitType: "polar" | "geostationary" | "static";
  overpassTime: string; // approximate local overpass time or update frequency
}

const LAYER_SOURCE_MAP: [string, LayerSourceInfo][] = [
  ["MODIS_Terra",   { satellite: "Terra",       instrument: "MODIS",    orbitType: "polar",         overpassTime: "Morning pass (1-2x/day)" }],
  ["MODIS_Aqua",    { satellite: "Aqua",        instrument: "MODIS",    orbitType: "polar",         overpassTime: "Afternoon pass (1-2x/day)" }],
  ["VIIRS_SNPP",    { satellite: "Suomi NPP",   instrument: "VIIRS",    orbitType: "polar",         overpassTime: "Afternoon pass (1-2x/day)" }],
  ["VIIRS_NOAA20",  { satellite: "NOAA-20",     instrument: "VIIRS",    orbitType: "polar",         overpassTime: "Afternoon pass (1-2x/day)" }],
  ["VIIRS_NOAA21",  { satellite: "NOAA-21",     instrument: "VIIRS",    orbitType: "polar",         overpassTime: "Afternoon pass (1-2x/day)" }],
  ["GOES-East",     { satellite: "GOES-16",     instrument: "ABI",      orbitType: "geostationary", overpassTime: "Continuous (~10 min updates)" }],
  ["GOES-West",     { satellite: "GOES-18",     instrument: "ABI",      orbitType: "geostationary", overpassTime: "Continuous (~10 min updates)" }],
  ["Himawari",      { satellite: "Himawari-9",  instrument: "AHI",      orbitType: "geostationary", overpassTime: "Continuous (~10 min updates)" }],
  ["OMI_",          { satellite: "Aura",        instrument: "OMI",      orbitType: "polar",         overpassTime: "Afternoon pass (1x/day)" }],
  ["OMPS_NOAA20",   { satellite: "NOAA-20",     instrument: "OMPS",     orbitType: "polar",         overpassTime: "Afternoon pass (1x/day)" }],
  ["OMPS_",         { satellite: "Suomi NPP",   instrument: "OMPS",     orbitType: "polar",         overpassTime: "Afternoon pass (1x/day)" }],
  ["TROPOMI",       { satellite: "Sentinel-5P", instrument: "TROPOMI",  orbitType: "polar",         overpassTime: "Afternoon pass (1x/day)" }],
  ["AIRS_",         { satellite: "Aqua",        instrument: "AIRS",     orbitType: "polar",         overpassTime: "Afternoon pass (1x/day)" }],
  ["HLS_L30",       { satellite: "Landsat 8/9", instrument: "OLI/TIRS", orbitType: "polar",         overpassTime: "Morning pass (every 8 days)" }],
  ["HLS_S30",       { satellite: "Sentinel-2",  instrument: "MSI",      orbitType: "polar",         overpassTime: "Morning pass (every 5 days)" }],
  ["SMAP_",         { satellite: "SMAP",        instrument: "Radiometer",orbitType: "polar",        overpassTime: "Dawn/dusk pass (1x/day)" }],
  ["nexrad",        { satellite: "Ground Radar",instrument: "NEXRAD",   orbitType: "static",        overpassTime: "Continuous (~5 min updates)" }],
  ["goes_west",     { satellite: "GOES-18",     instrument: "IR",       orbitType: "geostationary", overpassTime: "Continuous (~15 min updates)" }],
  ["s2cloudless",   { satellite: "Sentinel-2",  instrument: "MSI",      orbitType: "static",        overpassTime: "Static mosaic (annual)" }],
  ["GEBCO",         { satellite: "Bathymetry",  instrument: "Sonar",    orbitType: "static",        overpassTime: "Static dataset" }],
  ["Landsat_WELD",  { satellite: "Landsat 7/8", instrument: "ETM+/OLI", orbitType: "polar",        overpassTime: "Morning pass (monthly composite)" }],
  ["IMERG",         { satellite: "GPM",         instrument: "GMI+DPR",  orbitType: "polar",         overpassTime: "Continuous (30 min global)" }],
  ["OPERA_L3",      { satellite: "HLS/Sentinel",instrument: "OLI/MSI/SAR",orbitType: "polar",       overpassTime: "Multi-sensor (6-12 day revisit)" }],
];

export function getLayerSourceInfo(layerName: string): LayerSourceInfo | null {
  for (const [prefix, info] of LAYER_SOURCE_MAP) {
    if (layerName.includes(prefix)) return info;
  }
  return null;
}

/** Analyze temporal alignment of multiple layers — returns a warning if layers are from different satellites */
export function analyzeLayerAlignment(layers: { name: string }[]): { sources: LayerSourceInfo[]; warning: string | null } {
  const sources = layers
    .map(l => getLayerSourceInfo(l.name))
    .filter((s): s is LayerSourceInfo => s !== null);

  if (sources.length <= 1) return { sources, warning: null };

  // Check if all sources are from the same satellite
  const satellites = [...new Set(sources.map(s => s.satellite))];
  if (satellites.length === 1) return { sources, warning: null };

  // Check if we're mixing polar and geostationary
  const hasGeo = sources.some(s => s.orbitType === "geostationary");
  const hasPolar = sources.some(s => s.orbitType === "polar");

  if (hasGeo && hasPolar) {
    return {
      sources,
      warning: "Layers are from different orbit types — geostationary (continuous) and polar-orbit (1-2 passes/day). Timestamps will differ significantly."
    };
  }

  // Multiple polar satellites
  return {
    sources,
    warning: `Layers are from ${satellites.join(" + ")} — captured at different times during their respective overpasses. This is normal for multi-satellite analysis.`
  };
}

/** Check if a BBOX is compatible with a layer's constraint */
export function checkBboxCompatibility(bbox: string, constraint?: string): { ok: boolean; warning?: string } {
  if (!constraint || constraint === "any") return { ok: true };
  
  const parts = bbox.split(",").map(s => parseFloat(s.trim()));
  if (parts.length !== 4) return { ok: true };
  const [lon1, lat1, lon2, lat2] = parts;
  
  if (constraint === "americas") {
    const inAmericas = lon1 >= -170 && lon2 <= -30;
    if (!inAmericas) return { ok: false, warning: "⚠️ This layer only covers the Americas (GOES satellite is geostationary over the US)" };
  }
  
  if (constraint === "us") {
    const inUS = lon1 >= -130 && lon2 <= -60 && lat1 >= 20 && lat2 <= 55;
    if (!inUS) return { ok: false, warning: "⚠️ NEXRAD radar only covers the continental United States" };
  }
  
  // Note: land/ocean checks are informational only — GIBS will return data but it may be empty over water/land
  if (constraint === "ocean") {
    return { ok: true, warning: "ℹ️ This layer shows ocean data only — land areas will appear empty" };
  }
  
  if (constraint === "land") {
    return { ok: true, warning: "ℹ️ This layer shows land data only — ocean areas will appear empty" };
  }
  
  return { ok: true };
}

// ── 🚨 Real-World Disaster Event Presets ──────────────────────────────
// Each preset auto-fills the BBOX, date range, and WMS layers to instantly
// demonstrate real-world monitoring with 100% authentic NASA satellite data.
export interface EventPreset {
  name: string;
  emoji: string;
  description: string;
  bbox: string;
  startDate: string;
  endDate: string;
  timeStep: string;
  layers: { url: string; name: string; opacity: number }[];
}

export const EVENT_PRESETS: EventPreset[] = [
  {
    name: "2023 Canada Wildfires",
    emoji: "🔥",
    description: "Quebec wildfires that blanketed US East Coast in smoke (Jun 2023)",
    bbox: "-80.0, 45.0, -60.0, 55.0",
    startDate: "2023-06-01",
    endDate: "2023-06-15",
    timeStep: "1d",
    layers: [
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_Thermal_Anomalies_All", opacity: 0.8 },
    ],
  },
  {
    name: "2024 Iceland Eruption",
    emoji: "🌋",
    description: "Sundhnúksgígar eruptions — SO₂ plume tracking (Jan 2024)",
    bbox: "-24.0, 63.0, -21.0, 65.0",
    startDate: "2024-01-14",
    endDate: "2024-01-28",
    timeStep: "1d",
    layers: [
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "OMI_Sulfur_Dioxide_Lower_Troposphere", opacity: 0.7 },
    ],
  },
  {
    name: "Hurricane Ian Flooding",
    emoji: "🌪️",
    description: "Category 4 hurricane — Florida landfall & flooding (Sep 2022)",
    bbox: "-84.0, 24.0, -78.0, 30.0",
    startDate: "2022-09-25",
    endDate: "2022-10-05",
    timeStep: "1d",
    layers: [
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_Thermal_Anomalies_All", opacity: 0.6 },
    ],
  },
  {
    name: "Amazon Deforestation 2023",
    emoji: "🌿",
    description: "Tracking illegal logging via vegetation loss (Jul-Aug 2023)",
    bbox: "-65.0, -10.0, -50.0, 0.0",
    startDate: "2023-07-01",
    endDate: "2023-08-15",
    timeStep: "1d",
    layers: [
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_NDVI_8Day", opacity: 0.7 },
    ],
  },
  {
    name: "Delhi Pollution Crisis",
    emoji: "💨",
    description: "Stubble burning + Diwali smog peak over NCR (Nov 2023)",
    bbox: "74.0, 25.0, 82.0, 31.0",
    startDate: "2023-11-01",
    endDate: "2023-11-20",
    timeStep: "1d",
    layers: [
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_Aerosol_Optical_Depth_3km", opacity: 0.8 },
    ],
  },
  {
    name: "Arctic Sea Ice Minimum",
    emoji: "🧊",
    description: "Tracking polar ice cap melting at seasonal minimum (Sep 2023)",
    bbox: "-180.0, 65.0, 180.0, 90.0",
    startDate: "2023-08-15",
    endDate: "2023-09-30",
    timeStep: "1d",
    layers: [
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi", name: "MODIS_Terra_NDSI_Snow_Cover", opacity: 0.6 },
    ],
  },
];

// ── 🛰️ Orbital Satellite → Compatible WMS Layer Mapping ─────────────
// Maps each trackable satellite to the WMS layers it ACTUALLY produces.
// "imaging" satellites have onboard instruments whose data appears in NASA GIBS.
// "viewpoint" satellites have no GIBS imagery — they act as a flying camera
// to view other satellite data at the orbital position.
export interface OrbitalSatelliteConfig {
  id: string;           // matches backend SATELLITE_CATALOG key
  label: string;        // display name in dropdown
  noradId: number;
  altKm: number;        // nominal altitude
  type: "imaging" | "viewpoint";
  instrument?: string;  // primary instrument
  description: string;
  /** Compatible WMS layers from SATELLITE_CATALOG (by layerName). Only for imaging satellites. */
  compatibleLayers: { url: string; name: string; opacity: number }[];
  /** Suggested default layers to auto-populate (subset of compatibleLayers) */
  defaultLayers: { url: string; name: string; opacity: number }[];
}

const GIBS_URL = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi";

export const ORBITAL_SATELLITE_CONFIG: OrbitalSatelliteConfig[] = [
  // ── IMAGING SATELLITES (have real WMS data) ──
  {
    id: "TERRA", label: "🛰 TERRA — MODIS (Morning)", noradId: 25994, altKm: 705,
    type: "imaging", instrument: "MODIS",
    description: "Morning overpass (~10:30 AM local). Produces the most WMS layers in GIBS.",
    compatibleLayers: [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_Bands721", opacity: 1.0 },
      { url: GIBS_URL, name: "MODIS_Terra_Thermal_Anomalies_All", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Terra_Land_Surface_Temp_Day", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Terra_Land_Surface_Temp_Night", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Terra_Cloud_Top_Temp_Day", opacity: 0.7 },
      { url: GIBS_URL, name: "MODIS_Terra_Water_Vapor_5km_Day", opacity: 0.7 },
      { url: GIBS_URL, name: "MODIS_Terra_NDVI_8Day", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Terra_EVI_8Day", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Terra_NDSI_Snow_Cover", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Terra_L2_Sea_Surface_Temp_Day", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Terra_Aerosol_Optical_Depth_3km", opacity: 0.7 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "MODIS_Terra_Thermal_Anomalies_All", opacity: 0.8 },
    ],
  },
  {
    id: "AQUA", label: "🛰 AQUA — MODIS (Afternoon)", noradId: 27424, altKm: 705,
    type: "imaging", instrument: "MODIS",
    description: "Afternoon overpass (~1:30 PM local). Best for India/Asia daytime imagery.",
    compatibleLayers: [
      { url: GIBS_URL, name: "MODIS_Aqua_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "MODIS_Aqua_Thermal_Anomalies_All", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Aqua_Cloud_Top_Temp_Day", opacity: 0.7 },
      { url: GIBS_URL, name: "MODIS_Aqua_NDSI_Snow_Cover", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Aqua_L2_Sea_Surface_Temp_Day", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Aqua_L2_Chlorophyll_A", opacity: 0.8 },
      { url: GIBS_URL, name: "MODIS_Aqua_Aerosol_Optical_Depth_3km", opacity: 0.7 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "MODIS_Aqua_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "MODIS_Aqua_Thermal_Anomalies_All", opacity: 0.8 },
    ],
  },
  {
    id: "SUOMI_NPP", label: "🛰 Suomi NPP — VIIRS", noradId: 37849, altKm: 834,
    type: "imaging", instrument: "VIIRS",
    description: "Next-gen polar orbiter. VIIRS provides higher resolution than MODIS.",
    compatibleLayers: [
      { url: GIBS_URL, name: "VIIRS_SNPP_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "VIIRS_SNPP_Thermal_Anomalies_375m_All", opacity: 0.8 },
      { url: GIBS_URL, name: "VIIRS_SNPP_DayNightBand_At_Sensor_Radiance", opacity: 0.8 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "VIIRS_SNPP_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "VIIRS_SNPP_Thermal_Anomalies_375m_All", opacity: 0.8 },
    ],
  },
  {
    id: "NOAA-20", label: "🛰 NOAA-20 — VIIRS (JPSS-1)", noradId: 43013, altKm: 834,
    type: "imaging", instrument: "VIIRS",
    description: "Latest-gen JPSS satellite. Best 375m fire detection.",
    compatibleLayers: [
      { url: GIBS_URL, name: "VIIRS_NOAA20_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "VIIRS_NOAA20_Thermal_Anomalies_375m_All", opacity: 0.8 },
      { url: GIBS_URL, name: "VIIRS_NOAA20_DayNightBand_At_Sensor_Radiance", opacity: 0.8 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "VIIRS_NOAA20_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "VIIRS_NOAA20_Thermal_Anomalies_375m_All", opacity: 0.8 },
    ],
  },
  {
    id: "LANDSAT_8", label: "🛰 Landsat 8 — OLI/TIRS", noradId: 39084, altKm: 705,
    type: "imaging", instrument: "OLI",
    description: "30m high-resolution. Revisit every 8 days.",
    compatibleLayers: [
      { url: GIBS_URL, name: "HLS_L30_Nadir_BRDF_Adjusted_Reflectance", opacity: 1.0 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "HLS_L30_Nadir_BRDF_Adjusted_Reflectance", opacity: 1.0 },
    ],
  },
  {
    id: "LANDSAT_9", label: "🛰 Landsat 9 — OLI-2/TIRS-2", noradId: 49260, altKm: 705,
    type: "imaging", instrument: "OLI-2",
    description: "Latest Landsat. Shares same layer as Landsat 8 in HLS.",
    compatibleLayers: [
      { url: GIBS_URL, name: "HLS_L30_Nadir_BRDF_Adjusted_Reflectance", opacity: 1.0 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "HLS_L30_Nadir_BRDF_Adjusted_Reflectance", opacity: 1.0 },
    ],
  },
  {
    id: "SENTINEL_2A", label: "🛰 Sentinel-2A — MSI", noradId: 40697, altKm: 786,
    type: "imaging", instrument: "MSI",
    description: "ESA's 10m multispectral imager. Every 5 days.",
    compatibleLayers: [
      { url: GIBS_URL, name: "HLS_S30_Nadir_BRDF_Adjusted_Reflectance", opacity: 1.0 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "HLS_S30_Nadir_BRDF_Adjusted_Reflectance", opacity: 1.0 },
    ],
  },
  {
    id: "SMAP", label: "🛰 SMAP — Soil Moisture", noradId: 40376, altKm: 685,
    type: "imaging", instrument: "Radiometer",
    description: "Global soil moisture at 9km resolution.",
    compatibleLayers: [
      { url: GIBS_URL, name: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", opacity: 1.0 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "SMAP_L4_Analyzed_Root_Zone_Soil_Moisture", opacity: 1.0 },
    ],
  },
  {
    id: "NOAA-21", label: "🛰 NOAA-21 — VIIRS (JPSS-2)", noradId: 54234, altKm: 833,
    type: "imaging", instrument: "VIIRS",
    description: "Newest JPSS satellite (launched 2022). VIIRS 375m fire + true color.",
    compatibleLayers: [
      { url: GIBS_URL, name: "VIIRS_NOAA21_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "VIIRS_NOAA21_Thermal_Anomalies_375m_All", opacity: 0.8 },
      { url: GIBS_URL, name: "VIIRS_NOAA21_DayNightBand", opacity: 0.8 },
      { url: GIBS_URL, name: "VIIRS_NOAA21_Chlorophyll_a", opacity: 0.8 },
      { url: GIBS_URL, name: "VIIRS_NOAA21_Brightness_Temp_BandI5_Day", opacity: 0.7 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "VIIRS_NOAA21_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "VIIRS_NOAA21_Thermal_Anomalies_375m_All", opacity: 0.8 },
    ],
  },
  {
    id: "AURA", label: "🛰 AURA — OMI (Air Quality)", noradId: 28376, altKm: 705,
    type: "imaging", instrument: "OMI",
    description: "Carries OMI for NO₂, SO₂, ozone, and aerosol monitoring. A-Train constellation.",
    compatibleLayers: [
      { url: GIBS_URL, name: "OMI_Nitrogen_Dioxide_Tropo_Column", opacity: 0.8 },
      { url: GIBS_URL, name: "OMI_Sulfur_Dioxide_Lower_Troposphere", opacity: 0.8 },
      { url: GIBS_URL, name: "OMI_Absorbing_Aerosol_Optical_Depth", opacity: 0.7 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "OMI_Nitrogen_Dioxide_Tropo_Column", opacity: 0.8 },
    ],
  },
  {
    id: "SENTINEL_5P", label: "🛰 Sentinel-5P — TROPOMI", noradId: 42969, altKm: 824,
    type: "imaging", instrument: "TROPOMI",
    description: "ESA trace-gas mapper. 7km resolution SO₂, NO₂, CO, O₃, CH₄. Daily global.",
    compatibleLayers: [
      { url: GIBS_URL, name: "TROPOMI_L2_Sulfur_Dioxide_Total_Vertical_Column", opacity: 0.8 },
    ],
    defaultLayers: [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "TROPOMI_L2_Sulfur_Dioxide_Total_Vertical_Column", opacity: 0.8 },
    ],
  },

  // ── VIEWPOINT-ONLY SATELLITES (no WMS imagery, used as flying cameras) ──
  {
    id: "ISS", label: "🚀 ISS — Flying Camera", noradId: 25544, altKm: 420,
    type: "viewpoint",
    description: "International Space Station. No GIBS layers — uses as a moving viewpoint over other satellite data.",
    compatibleLayers: [],
    defaultLayers: [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "VIIRS_SNPP_DayNightBand_At_Sensor_Radiance", opacity: 0.7 },
    ],
  },
  {
    id: "TIANGONG", label: "🚀 Tiangong — Flying Camera", noradId: 48274, altKm: 390,
    type: "viewpoint",
    description: "Chinese Space Station. No GIBS layers — uses as a moving viewpoint.",
    compatibleLayers: [],
    defaultLayers: [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "VIIRS_SNPP_DayNightBand_At_Sensor_Radiance", opacity: 0.7 },
    ],
  },
  {
    id: "HST", label: "🔭 Hubble — Flying Camera", noradId: 20580, altKm: 540,
    type: "viewpoint",
    description: "Hubble Space Telescope. No Earth-imaging GIBS layers — viewpoint only.",
    compatibleLayers: [],
    defaultLayers: [
      { url: GIBS_URL, name: "VIIRS_SNPP_CorrectedReflectance_TrueColor", opacity: 1.0 },
    ],
  },
  {
    id: "SENTINEL_1A", label: "🛰 Sentinel-1A — SAR (Viewpoint)", noradId: 39634, altKm: 693,
    type: "viewpoint", instrument: "C-SAR",
    description: "Synthetic Aperture Radar. SAR data is not available in standard GIBS WMS layers.",
    compatibleLayers: [],
    defaultLayers: [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
    ],
  },
  {
    id: "SENTINEL_3A", label: "🛰 Sentinel-3A — OLCI (Viewpoint)", noradId: 41335, altKm: 814,
    type: "viewpoint", instrument: "OLCI",
    description: "Ocean/land color. OLCI data has limited GIBS WMS availability.",
    compatibleLayers: [],
    defaultLayers: [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "MODIS_Aqua_L2_Chlorophyll_A", opacity: 0.7 },
    ],
  },
  {
    id: "GPM_CORE", label: "🛰 GPM Core — Precipitation (Viewpoint)", noradId: 39574, altKm: 407,
    type: "viewpoint", instrument: "DPR/GMI",
    description: "Precipitation radar. GPM data is composited globally, not as direct WMS swath.",
    compatibleLayers: [],
    defaultLayers: [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "MODIS_Terra_Cloud_Top_Temp_Day", opacity: 0.7 },
    ],
  },
  {
    id: "CALIPSO", label: "🛰 CALIPSO — Lidar (Viewpoint)", noradId: 29108, altKm: 705,
    type: "viewpoint", instrument: "CALIOP",
    description: "Cloud/aerosol lidar profiling. Very narrow swath, not suitable for WMS area imagery.",
    compatibleLayers: [],
    defaultLayers: [
      { url: GIBS_URL, name: "MODIS_Terra_CorrectedReflectance_TrueColor", opacity: 1.0 },
      { url: GIBS_URL, name: "MODIS_Terra_Aerosol_Optical_Depth_3km", opacity: 0.7 },
    ],
  },
];

/** Look up orbital config by satellite ID */
export function getOrbitalConfig(satId: string): OrbitalSatelliteConfig | undefined {
  return ORBITAL_SATELLITE_CONFIG.find(s => s.id === satId);
}
