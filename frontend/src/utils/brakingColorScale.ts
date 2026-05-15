import * as d3 from 'd3';

/**
 * Creates a D3 continuous color scale mapping deceleration (km/h per sec) to colors.
 * Light braking (~10 km/h/s) = Cyan
 * Medium braking (~30 km/h/s) = Purple
 * Heavy braking (~60 km/h/s) = Red
 */
export const getBrakingColor = d3.scaleLinear<string>()
  .domain([5, 30, 60])
  .range(['#22d3ee', '#a855f7', '#ef4444']) // Cyan -> Purple -> Red
  .clamp(true);
