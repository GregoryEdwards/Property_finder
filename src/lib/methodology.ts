/**
 * Per-criterion methodology.
 *
 * For every criterion in the catalog, this module captures:
 *   - what the criterion measures (long-form, beyond the catalog blurb)
 *   - why it tends to matter for a household
 *   - how Phase 1.1's *synthetic* seed produces the values you see today
 *   - the real upstream sources we plan to ingest in Phase 2, with URLs,
 *     publisher, licence, publication cadence, and the last-known
 *     publication / refresh date as of authorship
 *   - any caveats users should be aware of
 *
 * Authored: 2026-05. Source publication dates are accurate as of authoring;
 * the publishers will have moved on by the time you read this. The
 * `publisherLastKnown` field reflects the freshest edition available at
 * authorship time.
 *
 * This file ships hard-coded for Phase 1.1; in Phase 2 the same content
 * will be authored in YAML alongside each criterion's pipeline config and
 * hot-reloaded by the data team.
 */

export interface SourceCitation {
  /** Human-readable name of the source / dataset. */
  name: string
  /** Publishing organisation. */
  publisher: string
  /** Canonical URL to the dataset / portal page. */
  url: string
  /** Open licence, where applicable. */
  licence: string
  /** Refresh / publication cadence. */
  cadence: string
  /** Latest publication (or refresh) known at the time of authorship. */
  publisherLastKnown: string
}

export interface CriterionMethodology {
  criterionId: string
  /** A few sentences on what the criterion measures, in plain English. */
  whatItMeasures: string
  /** One or two sentences on why a household might weight it. */
  whyItMatters: string
  /** How Phase 1.1 synthesises the value displayed on the map today. */
  phase1Estimation: string
  /** Real upstream sources for the Phase 2 production pipeline. */
  realSources: SourceCitation[]
  /** Optional caveats: bias risk, coverage gaps, methodological limits. */
  caveats?: string[]
}

/* ---------------------------------------------------------------------- */
/*  Catalog                                                                */
/* ---------------------------------------------------------------------- */

const FLOOD_RISK: CriterionMethodology = {
  criterionId: 'flood_risk',
  whatItMeasures:
    'The Environment Agency / Natural Resources Wales / SEPA banded flood-risk classification for a cell: Very Low, Low, Medium, or High. Combines fluvial (river), tidal and surface-water risks for planning purposes.',
  whyItMatters:
    'Insurance premiums, mortgageability, and resilience to future climate-driven flooding all turn on this band. A property inside a defended floodplain still typically pays a flood-loaded buildings premium.',
  phase1Estimation:
    'For each cell we measure great-circle distance to a synthetic Thames polyline plus a handful of London tributaries (WM uses the Tame, Cole, Stour, Sowe). Cells within ~0.4 km of the river centreline are tagged HIGH (treated as floodway); 0.4–0.9 km MEDIUM; 0.9–1.6 km LOW (with an east-side widening to mimic the tidal floodplain). A ~4% pseudo-random tile-rate produces scattered surface-water MEDIUM pockets elsewhere.',
  realSources: [
    {
      name: 'Flood Map for Planning (Rivers and Sea)',
      publisher: 'Environment Agency',
      url: 'https://environment.data.gov.uk/dataset/8d57464f-d465-11e4-8790-f0def148f590',
      licence: 'Open Government Licence v3.0',
      cadence: 'Quarterly',
      publisherLastKnown: 'Q1 2026',
    },
    {
      name: 'Risk of Flooding from Surface Water',
      publisher: 'Environment Agency',
      url: 'https://environment.data.gov.uk/dataset/8a09d10a-2a07-46a8-8a83-7be3a17e29be',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: '2025',
    },
    {
      name: 'Flood Map (Wales)',
      publisher: 'Natural Resources Wales',
      url: 'https://datamap.gov.wales/maps/?lang=en&theme=flooding',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: '2025',
    },
    {
      name: 'Flood Maps (Scotland)',
      publisher: 'SEPA',
      url: 'https://www.sepa.org.uk/environment/water/flooding/',
      licence: 'Open Government Licence v3.0',
      cadence: 'Biennial',
      publisherLastKnown: '2024',
    },
  ],
  caveats: [
    'The Phase-1 synthetic floodway is a single river polyline; real EA polygons are far more detailed, with defended areas, modelled surface-water hotspots, and explicit floodway/floodplain distinctions.',
    'Climate-projection layers (UKCP18 sea-level rise scenarios for 2050/2100) are not yet incorporated.',
  ],
}

const CRIME_RATE: CriterionMethodology = {
  criterionId: 'crime_rate',
  whatItMeasures:
    'Annualised count of all recorded crime (Home Office / police.uk category set: anti-social behaviour, burglary, robbery, violent and sexual offences, theft, etc.) per 1,000 residents in the cell.',
  whyItMatters:
    'A primary safety signal for households. The relative comparison is what most users want — absolute rates are heavily affected by recording practices.',
  phase1Estimation:
    'Built from a radial decay around Charing Cross (London) or Birmingham New Street (WM), with a fixed east-side bias for London and a multi-centre kernel for the WM (Birmingham + Coventry + Wolverhampton). Smoothed with a coherent random field; floor 8 incidents/1k/yr.',
  realSources: [
    {
      name: 'Crime data (street-level CSV)',
      publisher: 'data.police.uk',
      url: 'https://data.police.uk/data/',
      licence: 'Open Government Licence v3.0',
      cadence: 'Monthly (trailing 36 months)',
      publisherLastKnown: 'April 2026',
    },
    {
      name: 'Mid-year population estimates (denominator)',
      publisher: 'Office for National Statistics',
      url: 'https://www.ons.gov.uk/peoplepopulationandcommunity/populationandmigration/populationestimates',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: '2024 estimates (released 2025-09)',
    },
  ],
  caveats: [
    'Recorded crime is not victim survey crime — under-reporting bias varies by category and area.',
    'A single composite "crime rate" can mask important sub-pattern shifts (e.g. burglary down while ASB up). Phase 2 will optionally expose disaggregated categories.',
  ],
}

const AE_DRIVE_TIME: CriterionMethodology = {
  criterionId: 'ae_drive_time',
  whatItMeasures:
    'Driving time at 08:30 weekday from the cell centroid to the nearest NHS A&E department (Type 1 24-hour emergency).',
  whyItMatters:
    'Time-critical emergencies — strokes, MIs, paediatric injuries — turn on the first hour. Older households and families with young children particularly weight this.',
  phase1Estimation:
    'Distance to the nearest of a dozen synthetic A&E points placed at real London or West Midlands trauma-receiving hospitals (St Thomas\'s, Royal London, Queen Elizabeth Birmingham, UHCW Coventry, etc.), multiplied by a per-cell speed factor of ~1.05–1.5 min/km.',
  realSources: [
    {
      name: 'NHS Organisation Data Service — Hospital Site',
      publisher: 'NHS Digital',
      url: 'https://digital.nhs.uk/services/organisation-data-service',
      licence: 'Open Government Licence v3.0',
      cadence: 'Monthly',
      publisherLastKnown: 'April 2026',
    },
    {
      name: 'Routing graph (drive isochrones)',
      publisher: 'Self-hosted Valhalla on OpenStreetMap',
      url: 'https://valhalla.github.io/valhalla/',
      licence: 'OSM ODbL',
      cadence: 'OSM extracts pulled weekly',
      publisherLastKnown: 'Continuous',
    },
  ],
  caveats: [
    'Real drive times depend on time of day, road incidents, and the routing engine\'s assumptions. We commit to 08:30 weekday as the canonical commute-comparable departure.',
    'Type 2 / minor injury units are *not* counted; only Type 1 24-hour A&E departments.',
  ],
}

const FIRE_RESPONSE: CriterionMethodology = {
  criterionId: 'fire_response',
  whatItMeasures:
    'Indicative time from emergency call to the first appliance arriving at the scene of a primary fire (dwelling/property) in the cell, based on local Fire & Rescue Service averages.',
  whyItMatters:
    'Drives buildings-insurance loadings, particularly for rural properties. London Fire Brigade targets are 6 minutes for the first appliance; rural FRSes can be 11+ minutes.',
  phase1Estimation:
    'Linear function of distance from the city centre, with a smooth random field added (3 min jitter). Floor at 3 min. The synthetic surface ignores actual station locations.',
  realSources: [
    {
      name: 'Fire and Rescue Incident statistics (FIRE0501)',
      publisher: 'Home Office',
      url: 'https://www.gov.uk/government/statistical-data-sets/fire-statistics-data-tables',
      licence: 'Open Government Licence v3.0',
      cadence: 'Quarterly',
      publisherLastKnown: 'Q4 2025 (Mar 2026 release)',
    },
    {
      name: 'Fire station locations',
      publisher: 'Per-service open data (LFB, WMFS, etc.)',
      url: 'https://www.london-fire.gov.uk/about-us/open-data/',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: '2025',
    },
  ],
  caveats: [
    'Recorded response times are averaged across the entire FRS coverage area; cell-level estimates are derived, not observed.',
  ],
}

const PRIMARY_SCHOOL: CriterionMethodology = {
  criterionId: 'primary_school',
  whatItMeasures:
    'The most-recent Ofsted overall effectiveness rating (Outstanding / Good / Requires Improvement / Inadequate) for the *catchment* primary school covering the cell.',
  whyItMatters:
    'For families with primary-age children this is often the single highest-weighted criterion. Catchments and admissions criteria mean a child\'s school is largely determined by the postcode of the family home.',
  phase1Estimation:
    'A coherent random field with positive bias toward West and North London (or, for the WM, Solihull, Sutton Coldfield, and south Birmingham). Thresholded into the four-grade Ofsted scale at roughly 15% Outstanding / 55% Good / 25% RI / 5% Inadequate.',
  realSources: [
    {
      name: 'Ofsted state-funded schools — most recent inspections',
      publisher: 'Ofsted',
      url: 'https://www.gov.uk/government/statistical-data-sets/monthly-management-information-ofsteds-school-inspections-outcomes',
      licence: 'Open Government Licence v3.0',
      cadence: 'Monthly',
      publisherLastKnown: 'April 2026',
    },
    {
      name: 'Get Information About Schools (GIAS) catchment & admissions',
      publisher: 'Department for Education',
      url: 'https://www.get-information-schools.service.gov.uk/',
      licence: 'Open Government Licence v3.0',
      cadence: 'Daily updates; annual snapshots',
      publisherLastKnown: 'Continuous',
    },
  ],
  caveats: [
    'Catchments are determined annually by each local admissions authority and can change. Phase 1.1 approximates the catchment by nearest school.',
    'Ofsted reformed its single-grade headline rating in September 2024, replacing it with five sub-judgements and an end to the single overall-effectiveness word. Phase 2 will surface both new sub-judgements and historical single grades for transition continuity.',
  ],
}

const SECONDARY_SCHOOL: CriterionMethodology = {
  ...PRIMARY_SCHOOL,
  criterionId: 'secondary_school',
  whatItMeasures:
    'Ofsted overall effectiveness rating for the catchment secondary school (state-funded; academies and grammar schools included where applicable).',
  phase1Estimation: PRIMARY_SCHOOL.phase1Estimation.replace(
    'primary',
    'secondary',
  ),
}

const GP_WALK_TIME: CriterionMethodology = {
  criterionId: 'gp_walk_time',
  whatItMeasures:
    'Walking time at 4.5 km/h from the cell centroid to the nearest NHS GP practice currently accepting new patients.',
  whyItMatters:
    'Pre-school families and over-65s typically value short walks to a GP. The metric also correlates loosely with same-day appointment availability.',
  phase1Estimation:
    'A coherent random field 2–10 min plus a small extra factor for distance from the city centre. Implicitly assumes high practice density across the metro.',
  realSources: [
    {
      name: 'GP and GP practice related data',
      publisher: 'NHS Digital',
      url: 'https://digital.nhs.uk/data-and-information/publications/statistical/patients-registered-at-a-gp-practice',
      licence: 'Open Government Licence v3.0',
      cadence: 'Monthly',
      publisherLastKnown: 'April 2026',
    },
    {
      name: 'OS Open Roads (walk network)',
      publisher: 'Ordnance Survey',
      url: 'https://www.ordnancesurvey.co.uk/products/os-open-roads',
      licence: 'Open Government Licence v3.0',
      cadence: 'Bi-annual',
      publisherLastKnown: 'October 2025',
    },
  ],
  caveats: [
    '"Accepting new patients" is not always machine-readable; Phase 2 will use the NHS Choices catchment endpoint and surface a "list closure" warning where appropriate.',
  ],
}

const GREEN_SPACE: CriterionMethodology = {
  criterionId: 'green_space',
  whatItMeasures:
    'Walking time from the cell centroid to the nearest accessible park, common, allotment, playing field or formal open green space of at least 2 hectares.',
  whyItMatters:
    'Daily-life green space matters for under-5s, dog owners, and mental-health outcomes. WHO recommends a publicly accessible green space within 5 minutes\' walk.',
  phase1Estimation:
    'A coherent random field giving 2–14 min walk times across the metro; outer suburbs get a slight extra-time term.',
  realSources: [
    {
      name: 'OS Open Greenspace',
      publisher: 'Ordnance Survey',
      url: 'https://www.ordnancesurvey.co.uk/products/os-open-greenspace',
      licence: 'Open Government Licence v3.0',
      cadence: 'Bi-annual',
      publisherLastKnown: 'October 2025',
    },
    {
      name: 'Open Space (London) Strategy supporting data',
      publisher: 'Greater London Authority',
      url: 'https://data.london.gov.uk/dataset/open-space-strategy',
      licence: 'Open Government Licence v3.0',
      cadence: 'Per-borough updates',
      publisherLastKnown: 'Various, mostly 2023–2024',
    },
  ],
  caveats: [
    'Private gardens, golf courses, and inaccessible private grounds are excluded.',
    'Quality and amenity vary widely — a windswept playing field scores the same as Regent\'s Park here. Phase 2 will weight by size and amenity tags.',
  ],
}

const NATURE_ACCESS: CriterionMethodology = {
  criterionId: 'nature_access',
  whatItMeasures:
    'Driving time from the cell centroid to the nearest substantial natural land — woodland of ≥ 50 ha, National Nature Reserve, designated country park, AONB or National Park boundary. Distinct from `green_space` (local-walkable parks) — `nature_access` is about *getting into nature at the weekend*.',
  whyItMatters:
    'Many households genuinely value being able to be in woodland or open countryside within half an hour. This separates "I have a park near me" from "I can be in the Chilterns by 10am Saturday."',
  phase1Estimation:
    'Phase 1.1 ships a hand-curated list of substantial nature features near each region — for London: Epping Forest, Hampstead Heath, Richmond Park, the Chilterns AONB, Trent Park, etc.; for West Midlands: Sutton Park NNR, Cannock Chase AONB, Lickey Hills, the Clent Hills, Wyre Forest, the southern Peak District, and the northern Cotswolds AONB. Drive time is great-circle distance scaled by 1.3–1.9 min/km plus a 3–4 min "leaving the house" floor.',
  realSources: [
    {
      name: 'OS Open Greenspace (woodland category)',
      publisher: 'Ordnance Survey',
      url: 'https://www.ordnancesurvey.co.uk/products/os-open-greenspace',
      licence: 'Open Government Licence v3.0',
      cadence: 'Bi-annual',
      publisherLastKnown: 'October 2025',
    },
    {
      name: 'Priority Habitat Inventory (England)',
      publisher: 'Natural England',
      url: 'https://naturalengland-defra.opendata.arcgis.com/datasets/Defra::priority-habitat-inventory-england/about',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: '2025',
    },
    {
      name: 'Areas of Outstanding Natural Beauty (AONB) — England',
      publisher: 'Natural England',
      url: 'https://naturalengland-defra.opendata.arcgis.com/datasets/areas-of-outstanding-natural-beauty-england',
      licence: 'Open Government Licence v3.0',
      cadence: 'On change',
      publisherLastKnown: '2023 (rebrand to "National Landscapes" in progress)',
    },
    {
      name: 'National Parks (England, Wales, Scotland)',
      publisher: 'Natural England / NatureScot / NRW',
      url: 'https://environment.data.gov.uk/dataset/334e1b27-e193-4892-bce0-3c35aaf26420',
      licence: 'Open Government Licence v3.0',
      cadence: 'On change',
      publisherLastKnown: '2023',
    },
    {
      name: 'National Forest Inventory',
      publisher: 'Forest Research / Forestry Commission',
      url: 'https://www.forestresearch.gov.uk/tools-and-resources/statistics/data-downloads/national-forest-inventory/',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: 'March 2025 release (using 2024 woodland map)',
    },
  ],
  caveats: [
    'Drive time, not public-transport time. Households without a car will see this criterion overstate accessibility — Phase 2 will add a walking + transit alternative scoring path.',
    'Quality of nature varies: a 50-ha woodland is counted equally with a 5,000-ha National Park, which understates the appeal of the latter. Future iterations will scale by area + designation level.',
  ],
}

const MEDIAN_PRICE: CriterionMethodology = {
  criterionId: 'median_price',
  whatItMeasures:
    'Median residential sale price over the trailing 12 months in the cell, in £ GBP. All property types pooled; new-builds included.',
  whyItMatters:
    'Affordability and value-comparison driver. Listings inherit per-property prices but the cell baseline anchors expectations.',
  phase1Estimation:
    'Strong radial decay from Charing Cross (or Birmingham New Street) plus prime-area bumps (Notting Hill / Chelsea / Hampstead / Richmond / Wimbledon for London; Solihull / Sutton Coldfield / Edgbaston for WM). Floor £220k London / £140k WM.',
  realSources: [
    {
      name: 'Price Paid Data (PPD) full dataset',
      publisher: 'HM Land Registry',
      url: 'https://www.gov.uk/government/statistical-data-sets/price-paid-data-downloads',
      licence: 'Open Government Licence v3.0',
      cadence: 'Monthly',
      publisherLastKnown: 'April 2026 release',
    },
    {
      name: 'UK House Price Index',
      publisher: 'HM Land Registry / ONS / Registers of Scotland',
      url: 'https://www.gov.uk/government/collections/uk-house-price-index-reports',
      licence: 'Open Government Licence v3.0',
      cadence: 'Monthly',
      publisherLastKnown: 'February 2026 (March 2026 release)',
    },
  ],
  caveats: [
    'PPD lags ~6 weeks behind completion. Asking prices on Rightmove/Zoopla run ahead of PPD by ~12 weeks.',
    'Median collapses property mix; a cell dominated by 1-bed flats will show a far lower median than its true price per sqft would suggest.',
  ],
}

const COMMUTE_TIME: CriterionMethodology = {
  criterionId: 'commute_time',
  whatItMeasures:
    'Door-to-door public transport journey time from the cell centroid to the configured anchor (default: the region\'s primary terminus) departing at 08:30 on a weekday.',
  whyItMatters:
    'For households with at least one in-office worker this is often the second-highest-weighted criterion after price or schools.',
  phase1Estimation:
    'Radial decay from the anchor (Charing Cross or Birmingham New Street), with a slight uplift for the western corridors in London (Met / Piccadilly bias). Per-km factor 1.4–2.1 min/km.',
  realSources: [
    {
      name: 'TfL Unified API + GTFS feeds',
      publisher: 'Transport for London',
      url: 'https://tfl.gov.uk/info-for/open-data-users/',
      licence: 'TfL Open Data Terms',
      cadence: 'Real-time (status); GTFS weekly',
      publisherLastKnown: 'Continuous',
    },
    {
      name: 'TransportAPI (national rail + bus)',
      publisher: 'TransportAPI Ltd',
      url: 'https://www.transportapi.com/',
      licence: 'Commercial',
      cadence: 'Real-time',
      publisherLastKnown: 'Continuous',
    },
    {
      name: 'OpenTripPlanner (self-hosted)',
      publisher: 'OTP community',
      url: 'https://www.opentripplanner.org/',
      licence: 'LGPL',
      cadence: 'Per data refresh',
      publisherLastKnown: 'N/A — self-hosted',
    },
  ],
}

const COUNCIL_TAX: CriterionMethodology = {
  criterionId: 'council_tax',
  whatItMeasures:
    'Modal council tax band (A through H) for residential properties in the cell. Lower bands mean a lower annual bill (varying by local authority).',
  whyItMatters:
    'Ongoing carry cost. The 2024–25 average Band D bill in England was £2,171; the Band A bill is two-thirds of that and Band H is twice it.',
  phase1Estimation:
    'Driven by the price field with added noise so it is not perfectly redundant. Affluent corridors (W / SW London; Solihull / Sutton in the WM) cluster at F / G; outer / east bands skew A–C.',
  realSources: [
    {
      name: 'Council Tax: stock of properties by band',
      publisher: 'Valuation Office Agency',
      url: 'https://www.gov.uk/government/statistics/council-tax-stock-of-properties-2024',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: 'September 2025',
    },
    {
      name: 'Local authority council tax level',
      publisher: 'DLUHC',
      url: 'https://www.gov.uk/government/collections/council-tax-statistics',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: 'March 2026',
    },
  ],
  caveats: [
    'Council tax bands in England and Scotland were set on 1991 valuations; in Wales on 2003 valuations. They are an imperfect proxy for current value but are stable, well-documented, and immediately visible on the property listing.',
  ],
}

const AIR_QUALITY_NO2: CriterionMethodology = {
  criterionId: 'air_quality_no2',
  whatItMeasures:
    'Modelled annual mean nitrogen dioxide concentration in µg/m³. The WHO 2021 guideline is 10 µg/m³; the UK statutory annual mean limit is 40 µg/m³.',
  whyItMatters:
    'Long-term NO₂ exposure is associated with respiratory and cardiovascular disease. Households with children, older adults, or asthmatic members generally weight this highly.',
  phase1Estimation:
    'Sum of: a radial peak around the city centre, a corridor near major arterials (M25 / M6 / M5 / M42 / North Circular / A38), and a smooth field. Heathrow / Birmingham Airport approach paths contribute an additional bump. Floor 5 µg/m³.',
  realSources: [
    {
      name: 'Background NO₂ concentration maps',
      publisher: 'Defra / Ricardo Energy & Environment',
      url: 'https://uk-air.defra.gov.uk/data/laqm-background-maps',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: '2023 base year (released February 2025)',
    },
    {
      name: 'AURN automatic urban and rural network (real-time)',
      publisher: 'Defra',
      url: 'https://uk-air.defra.gov.uk/networks/network-info?view=aurn',
      licence: 'Open Government Licence v3.0',
      cadence: 'Hourly',
      publisherLastKnown: 'Continuous',
    },
  ],
  caveats: [
    'Defra background maps are modelled on a 1 km grid with concentrations rounded down; near-road exposure can be 50% higher than the cell-level value.',
    'Other pollutants (PM2.5, PM10, O₃) are not yet exposed as separate criteria.',
  ],
}

const NOISE_ROAD: CriterionMethodology = {
  criterionId: 'noise_road',
  whatItMeasures:
    'Modelled annual L_den road-traffic noise level in decibels. L_den is the day-evening-night indicator used by the EU Environmental Noise Directive.',
  whyItMatters:
    'Sleep quality, conversation comfort, and outdoor amenity all degrade above ~55 dB L_den. Roadside front rooms can be 15+ dB above interior-of-block rooms.',
  phase1Estimation:
    'Inverse-distance peak around the synthetic arterial polylines (M25, M6, M5, M42, A406, A205, A40, A38, A45, etc.) plus city-centre and airport boosters. Floor 38 dB.',
  realSources: [
    {
      name: 'Strategic Noise Mapping (Round 4)',
      publisher: 'Defra',
      url: 'https://www.gov.uk/government/publications/strategic-noise-mapping-2022',
      licence: 'Open Government Licence v3.0',
      cadence: '5-yearly under the Environmental Noise (England) Regulations 2006',
      publisherLastKnown: '2022 maps (published 2024)',
    },
  ],
  caveats: [
    'Strategic noise maps cover major roads, railways, airports and agglomerations; minor roads inside agglomerations may be under-modelled.',
    'Rail and aviation noise are *not* combined with road noise in this criterion; Phase 2 will optionally split them out.',
  ],
}

const BROADBAND_SPEED: CriterionMethodology = {
  criterionId: 'broadband_speed',
  whatItMeasures:
    'Maximum advertised download speed available at the cell\'s representative address from any fixed-line provider. Counts FTTP, FTTC, and cable.',
  whyItMatters:
    'For remote / hybrid workers, the difference between FTTC (~70 Mbps) and FTTP (1 Gbps) materially affects working-from-home viability.',
  phase1Estimation:
    'A coherent random field 40–1000 Mbps with a slight downward gradient with distance from the city centre; outer-fringe cells occasionally see speeds in the 40–80 Mbps range.',
  realSources: [
    {
      name: 'Connected Nations',
      publisher: 'Ofcom',
      url: 'https://www.ofcom.org.uk/research-and-data/multi-sector-research/infrastructure-research/connected-nations',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual main report + interim',
      publisherLastKnown: 'December 2025',
    },
    {
      name: 'Connected Nations data downloads (postcode-level)',
      publisher: 'Ofcom',
      url: 'https://www.ofcom.org.uk/phones-telecoms-and-internet/advice-for-consumers/advice/ofcom-checker',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: 'December 2025',
    },
  ],
  caveats: [
    '"Maximum advertised" — actual delivered speed at peak is materially lower, particularly on copper-served properties.',
    'Mobile / 5G availability is not yet exposed as a criterion.',
  ],
}

const PTAL: CriterionMethodology = {
  criterionId: 'ptal',
  whatItMeasures:
    'Public Transport Accessibility Level. Mapped to a 0–8 scale (0 = isolated, 8 = the inside of Zone 1). London uses the TfL WebCAT PTAL grid; outside London we synthesise a comparable index from rail-station + bus-stop density and frequency.',
  whyItMatters:
    'Composite measure of how easily residents can reach jobs, schools and amenities by public transport. Affects car-ownership rates and saleability for car-light households.',
  phase1Estimation:
    'London: radial decay from Charing Cross with a coherent random field. WM: max of three decays centred on Birmingham New Street, Coventry, and Wolverhampton.',
  realSources: [
    {
      name: 'WebCAT PTAL',
      publisher: 'Transport for London',
      url: 'https://www.tfl.gov.uk/info-for/urban-planning-and-construction/planning-with-webcat/webcat',
      licence: 'TfL Open Data Terms',
      cadence: 'Periodic (refreshed on major timetable changes)',
      publisherLastKnown: '2024 refresh',
    },
    {
      name: 'NaPTAN — National Public Transport Access Nodes',
      publisher: 'DfT',
      url: 'https://www.data.gov.uk/dataset/ff93ffc1-6656-47d8-9155-85ea0b8f2251/national-public-transport-access-nodes-naptan',
      licence: 'Open Government Licence v3.0',
      cadence: 'Daily',
      publisherLastKnown: 'Continuous',
    },
    {
      name: 'BODS — Bus Open Data Service',
      publisher: 'DfT',
      url: 'https://www.bus-data.dft.gov.uk/',
      licence: 'Open Government Licence v3.0',
      cadence: 'Real-time',
      publisherLastKnown: 'Continuous',
    },
  ],
  caveats: [
    'PTAL outside London is a *proxy*: PTAL itself is defined only for the London region. We name our 0–8 score "PTAL" for shared user comprehension but compute it differently in regions without TfL\'s grid.',
    'PTAL weights frequency but not actual travel time; a high-PTAL cell does not guarantee a fast journey.',
  ],
}

const MEDIAN_SALARY: CriterionMethodology = {
  criterionId: 'median_salary',
  whatItMeasures:
    'Median gross annual salary for full-time residents (workplace-based earnings preferred for the WM and similar; resident-based for inner London where commuter patterns make residence-based the cleaner local-economy signal). Source: ONS Annual Survey of Hours and Earnings (ASHE).',
  whyItMatters:
    'Affordability check (does the local labour market support the local price level?) and economic-strength signal for investors. Salary correlates with retail spend, leisure provision and infrastructure investment.',
  phase1Estimation:
    'Distance-decay bumps around the city centre and affluent commuter belts; floor £22k London / £23k WM; ceiling ~£75k. Spatial pattern mirrors but is not identical to median price (slight independent jitter so the two criteria are not redundant).',
  realSources: [
    {
      name: 'ASHE Table 7 — place of work by local authority',
      publisher: 'Office for National Statistics',
      url: 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/placeofworkbylocalauthorityashetable7',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: 'November 2025 (October 2025 reference)',
    },
    {
      name: 'ASHE Table 8 — place of residence by local authority',
      publisher: 'Office for National Statistics',
      url: 'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/datasets/placeofresidencebylocalauthorityashetable8',
      licence: 'Open Government Licence v3.0',
      cadence: 'Annual',
      publisherLastKnown: 'November 2025',
    },
  ],
  caveats: [
    'Local authority is a coarse unit; intra-LA variation can be large. Phase 2 will aggregate to MSOA where available.',
    'Means are skewed by high earners; ASHE\'s median is the right indicator but read alongside the gross-earnings deciles for a full picture.',
  ],
}

const GYM_ACCESS: CriterionMethodology = {
  criterionId: 'gym_access',
  whatItMeasures:
    'Walking time to the nearest gym, leisure centre or public swimming pool that is open to the public on standard membership terms.',
  whyItMatters:
    'For health-conscious households the perceived friction of getting to a workout is a strong predictor of actual gym attendance. A short walk also captures presence of council leisure facilities.',
  phase1Estimation:
    'Coherent random field 3–12 min walking, plus extra time for outer-fringe cells (~0.7 min per km beyond a 6 km core).',
  realSources: [
    {
      name: 'OpenStreetMap leisure POIs (leisure=fitness_centre, sports_centre, swimming_pool)',
      publisher: 'OpenStreetMap Foundation',
      url: 'https://www.openstreetmap.org/',
      licence: 'Open Database Licence (ODbL)',
      cadence: 'Continuous community editing',
      publisherLastKnown: 'Live',
    },
    {
      name: 'Active Places Power (Sport England leisure facility register)',
      publisher: 'Sport England',
      url: 'https://www.activeplacespower.com/',
      licence: 'Sport England terms',
      cadence: 'Continuous',
      publisherLastKnown: 'Live',
    },
  ],
  caveats: [
    'Membership-only private clubs are included if signposted as such on OSM. Hotel gyms are excluded.',
    'No quality signal: a council leisure centre with one rusting bench-press counts equally with a flagship Virgin Active.',
  ],
}

/* ---------------------------------------------------------------------- */
/*  Registry                                                               */
/* ---------------------------------------------------------------------- */

export const METHODOLOGIES: CriterionMethodology[] = [
  FLOOD_RISK,
  CRIME_RATE,
  AE_DRIVE_TIME,
  FIRE_RESPONSE,
  PRIMARY_SCHOOL,
  SECONDARY_SCHOOL,
  GP_WALK_TIME,
  GREEN_SPACE,
  NATURE_ACCESS,
  GYM_ACCESS,
  MEDIAN_PRICE,
  COMMUTE_TIME,
  COUNCIL_TAX,
  AIR_QUALITY_NO2,
  NOISE_ROAD,
  BROADBAND_SPEED,
  PTAL,
  MEDIAN_SALARY,
]

export const METHODOLOGY_BY_ID: Record<string, CriterionMethodology> =
  Object.fromEntries(METHODOLOGIES.map((m) => [m.criterionId, m]))

/**
 * The date this methodology content was last reviewed by a human and the
 * publishing-cadence references audited. Displayed on the methodology
 * pages so users know how stale the citations are.
 */
export const METHODOLOGY_LAST_REVIEWED = '2026-05-13'
