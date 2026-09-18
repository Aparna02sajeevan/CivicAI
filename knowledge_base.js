/**
 * knowledge_base.js
 * -----------------
 * Sample municipal policy documents for the City of Greenville.
 * Covers SDG 6 (Clean Water & Sanitation) and SDG 12 (Responsible Consumption & Production).
 *
 * Each document has: id, category, title, icon, color, and content chunks.
 * Chunks are the unit of retrieval in the RAG pipeline.
 */

const KNOWLEDGE_BASE = [
  // ─────────────────────────────────────────────
  // WATER SERVICES (SDG 6)
  // ─────────────────────────────────────────────
  {
    id: "doc-water-leaks",
    category: "Water Services",
    title: "Water Leak Reporting & Emergency Procedures",
    icon: "💧",
    sdg: 6,
    color: "#00b4d8",
    chunks: [
      {
        id: "water-leak-1",
        text: "To report a water leak in Greenville, call the 24-hour Water Emergency Hotline at 1-800-GRN-WATER (1-800-476-9283). For non-emergency leaks, you can also submit a report online at greenville.gov/water-report or visit the Municipal Water Office at 42 Civic Center Drive, Mon–Fri 8am–5pm."
      },
      {
        id: "water-leak-2",
        text: "A water leak is classified as an emergency if: water is gushing from the ground or a pipe, a water main has burst, sewage is backing up into a home, or flooding is imminent. Emergency crews are dispatched within 2 hours of an emergency report, 24 hours a day, 7 days a week including holidays."
      },
      {
        id: "water-leak-3",
        text: "For leaks on private property (inside your home or on your side of the water meter), the homeowner is responsible for repairs. Greenville offers a Low-Income Plumbing Assistance Program (LPAP) that provides up to $500 in repair subsidies for qualifying households. Call 1-800-GRN-WATER to apply."
      },
      {
        id: "water-leak-4",
        text: "Leaks on public property (between the water main and the meter) are the City's responsibility. After reporting, you will receive a tracking number. You can track repair status online at greenville.gov/service-tracker using your tracking number. Most public-side leaks are repaired within 48 hours."
      },
      {
        id: "water-leak-5",
        text: "If you suspect a silent leak (e.g., running toilet, dripping faucet), Greenville Water Authority offers free Leak Detection Kits at all Public Libraries and the Water Office. You can also request a free Smart Meter Audit online to detect invisible leaks in your plumbing system."
      }
    ]
  },

  {
    id: "doc-water-quality",
    category: "Water Services",
    title: "Water Quality & Complaints",
    icon: "🧪",
    sdg: 6,
    color: "#0077b6",
    chunks: [
      {
        id: "water-quality-1",
        text: "Greenville's drinking water meets all federal and state Safe Drinking Water Act standards. The Annual Water Quality Report (Consumer Confidence Report) is published each July at greenville.gov/water-quality. Paper copies are available at the Water Office and all branch libraries."
      },
      {
        id: "water-quality-2",
        text: "To file a water quality complaint (e.g., discolored water, unusual taste or odor, suspected contamination), call the Water Quality Hotline at 555-GRN-H2O (555-476-4260) or email waterquality@greenville.gov. Include your address, the nature of the issue, and when it started. Inspectors will respond within 24 hours."
      },
      {
        id: "water-quality-3",
        text: "If your water appears brown or rusty, it may be due to sediment disturbance from nearby construction or main flushing. Run cold water from your tap for 3–5 minutes. If the discoloration persists, contact the Water Quality Hotline. Do NOT drink discolored water until it is confirmed safe."
      },
      {
        id: "water-quality-4",
        text: "Greenville conducts Lead and Copper testing every 3 years in older neighborhoods. If your home was built before 1986, request a free Lead Test Kit from the Water Office. Homes with lead service lines are eligible for the Greenville Lead Service Line Replacement Program at no cost to the homeowner."
      },
      {
        id: "water-quality-5",
        text: "Boil Water Advisories are issued when microbial contamination is suspected. Advisories are posted on greenville.gov/alerts, the Greenville City app, social media @GreenvilleCity, and via the Emergency Alert System. Boil all water used for drinking, cooking, and brushing teeth until the advisory is lifted."
      }
    ]
  },

  {
    id: "doc-water-conservation",
    category: "Water Services",
    title: "Water Conservation Programs",
    icon: "🌊",
    sdg: 6,
    color: "#48cae4",
    chunks: [
      {
        id: "water-conservation-1",
        text: "Greenville's Water Conservation Program offers rebates on water-efficient appliances. Residents can receive up to $150 rebate on ENERGY STAR certified washing machines, up to $100 on high-efficiency toilets (1.28 gpf or less), and up to $75 on WaterSense certified dishwashers. Apply at greenville.gov/rebates."
      },
      {
        id: "water-conservation-2",
        text: "Outdoor watering restrictions are in effect year-round: watering is permitted only between 6am–10am and 6pm–10pm. During drought conditions (Stage 1 or higher), watering is restricted to alternate days based on your address (odd addresses on odd calendar days, even on even days). Violators face fines starting at $100."
      },
      {
        id: "water-conservation-3",
        text: "Free rain barrels (55-gallon capacity) are available to Greenville residents through the Rainwater Harvesting Program. Limit one per household per year. Pick up at the Municipal Yard, 789 Industrial Blvd, on the first Saturday of each month. Bring a valid ID and proof of Greenville residency."
      },
      {
        id: "water-conservation-4",
        text: "Greenville offers free Water Wise Home Audits to all residential customers. A certified auditor visits your home to assess indoor and outdoor water use and recommend improvements. To schedule an audit, call 555-GRN-SAVE or book online at greenville.gov/water-audit. Appointments available Mon–Sat."
      }
    ]
  },

  // ─────────────────────────────────────────────
  // WASTE MANAGEMENT (SDG 12)
  // ─────────────────────────────────────────────
  {
    id: "doc-garbage-collection",
    category: "Waste Management",
    title: "Garbage & Recycling Collection Schedule",
    icon: "🗑️",
    sdg: 12,
    color: "#2d6a4f",
    chunks: [
      {
        id: "garbage-1",
        text: "Greenville is divided into 5 collection zones (A–E). Each zone has a designated garbage and recycling collection day. Zone A: Monday. Zone B: Tuesday. Zone C: Wednesday. Zone D: Thursday. Zone E: Friday. To find your zone, enter your address at greenville.gov/collection-zone or call 555-GRN-TRASH."
      },
      {
        id: "garbage-2",
        text: "Place bins at the curb by 6:00 AM on your collection day. Bins must be within 3 feet of the curb. Do not block driveways, fire hydrants, or mailboxes. After collection, return bins to your property by 8:00 PM the same day. Bins left out after 8pm may result in a courtesy notice."
      },
      {
        id: "garbage-3",
        text: "Greenville provides a 96-gallon black bin for general garbage and a 96-gallon blue bin for recyclables. New residents can request bins at no cost at the Public Works Department, 100 City Hall Plaza, or online at greenville.gov/bins. Replacement bins cost $35 each. Extra garbage bags (official green bags) are available at grocery stores for $3 each."
      },
      {
        id: "garbage-4",
        text: "Collection is suspended on the following public holidays: New Year's Day, Memorial Day, Independence Day, Labor Day, Thanksgiving Day, and Christmas Day. When a holiday falls on or before your collection day in that week, collection shifts to the next day. Check the holiday schedule at greenville.gov/holiday-schedule."
      },
      {
        id: "garbage-5",
        text: "If your bin was not collected on your scheduled day, report a missed collection at greenville.gov/missed-pickup or call 555-GRN-TRASH by 5:00 PM. Leave the bin at the curb and crews will return within 24 hours. Missed collections due to improper bin placement (too far from curb, blocked, overloaded) are not eligible for re-collection."
      }
    ]
  },

  {
    id: "doc-recycling",
    category: "Waste Management",
    title: "Recycling Program & Accepted Materials",
    icon: "♻️",
    sdg: 12,
    color: "#40916c",
    chunks: [
      {
        id: "recycling-1",
        text: "Greenville uses a single-stream recycling system. Place all accepted recyclables loose in your blue bin — do not bag them. Accepted materials: paper and cardboard (flattened), glass bottles and jars (rinsed), aluminum cans, steel/tin cans, plastic bottles and jugs labeled #1–#7. All items must be clean, dry, and empty."
      },
      {
        id: "recycling-2",
        text: "The following items are NOT accepted in curbside recycling bins: plastic bags, Styrofoam, electronics, batteries, light bulbs, medical waste, food waste, ceramics, clothing, mirrors, window glass, motor oil containers, paint cans, and garden hoses. Contaminated loads may result in the entire bin being sent to landfill."
      },
      {
        id: "recycling-3",
        text: "Cardboard boxes must be broken down flat and tied in bundles no larger than 2 feet x 2 feet. Large quantities of cardboard can be taken to the Greenville Recycling & Transfer Station at 789 Industrial Blvd, open Mon–Sat 7am–5pm. Up to 500 lbs of cardboard per visit is accepted free of charge."
      },
      {
        id: "recycling-4",
        text: "Greenville offers food scrap composting collection for residents enrolled in the Green Cart Program. A 35-gallon green bin is provided for food scraps (fruit, vegetables, meat, dairy, eggshells) and yard waste. Green Cart pickup occurs on the same day as regular collection. To enroll, visit greenville.gov/green-cart or call 555-GRN-GROW."
      },
      {
        id: "recycling-5",
        text: "Residents can earn Greenville Green Points for recycling. Points are tracked via the Greenville City app by scanning your account QR code on your bin. Accumulated points can be redeemed for discounts at local businesses, free park passes, or donated to local environmental nonprofits. Download the app at greenville.gov/app."
      }
    ]
  },

  {
    id: "doc-ewaste",
    category: "Waste Management",
    title: "E-Waste & Electronics Recycling",
    icon: "💻",
    sdg: 12,
    color: "#52b788",
    chunks: [
      {
        id: "ewaste-1",
        text: "E-waste (electronic waste) cannot be placed in regular recycling or garbage bins in Greenville. Accepted e-waste items include: computers, laptops, tablets, smartphones, TVs, monitors, printers, keyboards, mice, cables, cameras, and small appliances. All personal data should be wiped before drop-off."
      },
      {
        id: "ewaste-2",
        text: "E-waste can be dropped off free of charge at the Greenville E-Waste Recycling Centre, 201 Tech Park Road, open Tuesday–Saturday 9am–4pm. Items accepted: computers, monitors, televisions, mobile phones, tablets, keyboards, mice, cables, printers, and small electronics. Large appliances (fridges, washing machines) are NOT accepted here."
      },
      {
        id: "ewaste-3",
        text: "Greenville partners with BestBuy, Staples, and Office Depot for in-store e-waste drop-off. These locations accept cell phones, tablets, laptops, and small electronics at no charge regardless of brand or purchase location. Check participating store locations at greenville.gov/ewaste-partners."
      },
      {
        id: "ewaste-4",
        text: "Greenville holds free E-Waste Collection Events on the last Saturday of every third month (March, June, September, December) at the Municipal Yard, 789 Industrial Blvd. These events also accept large electronics like televisions and desktop computers. No appointment required. Hours: 8am–2pm."
      },
      {
        id: "ewaste-5",
        text: "Businesses generating e-waste must use a licensed e-waste recycler registered with the State Environmental Protection Agency. A list of certified business e-waste recyclers serving Greenville is available at greenville.gov/business-ewaste. Businesses may NOT use residential drop-off facilities."
      }
    ]
  },

  {
    id: "doc-bulk-waste",
    category: "Waste Management",
    title: "Bulk Waste & Large Item Pickup",
    icon: "🛋️",
    sdg: 12,
    color: "#74c69d",
    chunks: [
      {
        id: "bulk-1",
        text: "Greenville offers free bulk waste pickup for large items that do not fit in regular bins, such as furniture, mattresses, appliances, and yard debris. Each household is entitled to 4 free bulk pickups per year. Schedule a pickup at greenville.gov/bulk-pickup or call 555-GRN-BULK at least 48 hours in advance."
      },
      {
        id: "bulk-2",
        text: "Items accepted for bulk pickup include: sofas, chairs, beds and mattresses, dressers, desks, tables, non-functional appliances (stoves, washers, dryers, refrigerators with freon removed), rugs (rolled and tied), and bundled yard waste (branches cut to 4-foot lengths). Maximum 5 items per pickup appointment."
      },
      {
        id: "bulk-3",
        text: "Items NOT accepted for bulk curbside pickup: hazardous waste, electronics (e-waste), paint, construction debris (drywall, lumber, concrete), tires, motor oil, propane tanks, and infectious materials. These require special disposal — see the Household Hazardous Waste section for proper disposal procedures."
      },
      {
        id: "bulk-4",
        text: "Place bulk items at the curb by 6:00 AM on your scheduled pickup day. Do not place items out more than 24 hours before your appointment. Crews cannot enter private property to collect items. Items must be placed separately — do not bag or bind multiple items together unless specified (e.g., bundled branches)."
      }
    ]
  },

  {
    id: "doc-hazardous-waste",
    category: "Waste Management",
    title: "Household Hazardous Waste Disposal",
    icon: "⚠️",
    sdg: 12,
    color: "#f4a261",
    chunks: [
      {
        id: "hazardous-1",
        text: "Household Hazardous Waste (HHW) includes items like paint, pesticides, fertilizers, pool chemicals, motor oil, antifreeze, batteries, fluorescent bulbs, propane tanks, and cleaning solvents. These must NEVER be placed in regular garbage, poured down drains, or dumped on the ground. Improper disposal is illegal and harmful to waterways."
      },
      {
        id: "hazardous-2",
        text: "The Greenville Household Hazardous Waste Facility is located at 45 Environmental Way and is open to residents every Saturday from 8am–3pm, year-round. No appointment needed. Bring items in original containers if possible. Accepted free of charge for residential quantities. Limit 15 gallons or 125 lbs per visit."
      },
      {
        id: "hazardous-3",
        text: "Paint is the most common HHW item. Latex paint can be dried out (leave lid off in well-ventilated area or add cat litter to solidify) and then placed in regular garbage once fully solid. Oil-based paint must go to the HHW Facility. Unused paint in good condition can be donated at the Greenville Paint Exchange, open Saturdays 9am–1pm at the HHW Facility."
      },
      {
        id: "hazardous-4",
        text: "Household batteries (AA, AAA, C, D, 9V) can be dropped off at over 40 locations across Greenville including libraries, community centers, and hardware stores. The full drop-off list is at greenville.gov/battery-drop. Car batteries are accepted at all auto parts stores and the HHW Facility. Do NOT put batteries in any bin — they can cause fires."
      },
      {
        id: "hazardous-5",
        text: "Sharps (needles, lancets, syringes) are classified as medical waste and require special disposal. Sharps collection boxes are available at all Greenville pharmacies. Never recap needles or place loose sharps in trash or recycling. Mail-back sharps disposal programs are available for $10 at greenville.gov/sharps. Improper sharps disposal carries a $250 fine."
      }
    ]
  },

  // ─────────────────────────────────────────────
  // STORMWATER & DRAINS
  // ─────────────────────────────────────────────
  {
    id: "doc-stormwater",
    category: "Stormwater & Drains",
    title: "Stormwater Drain Maintenance & Flooding",
    icon: "🌧️",
    sdg: 6,
    color: "#457b9d",
    chunks: [
      {
        id: "stormwater-1",
        text: "Stormwater drains and catch basins in Greenville are maintained by the Public Works Department. To report a blocked or damaged storm drain, call 555-GRN-DRAIN or submit a report online at greenville.gov/drain-report. Include the nearest address or cross-street. Crews inspect reported blockages within 72 hours."
      },
      {
        id: "stormwater-2",
        text: "Never dump anything into storm drains. Storm drains lead directly to local waterways and the bay — they are NOT connected to the sewage treatment system. Illegal dumping into storm drains includes: motor oil, paint, cleaning chemicals, grass clippings, leaves, pet waste, food waste, and concrete washout. Fines range from $500 to $10,000."
      },
      {
        id: "stormwater-3",
        text: "If your property experiences flooding during heavy rain, contact the Stormwater Division at 555-GRN-FLOOD. For life-threatening flooding, call 911 immediately. Greenville maps flood-prone areas annually — check if your property is in a flood zone at greenville.gov/flood-map. Flood zone residents are eligible for subsidized flood insurance through the FEMA National Flood Insurance Program."
      },
      {
        id: "stormwater-4",
        text: "Residents are encouraged to install rain gardens, bioswales, and permeable pavement to manage stormwater on private property. Greenville offers a Green Infrastructure Rebate of up to $1,000 for eligible stormwater management installations. Apply at greenville.gov/green-infrastructure. Free design consultations are available from the Stormwater Division."
      }
    ]
  },

  // ─────────────────────────────────────────────
  // SDG PROGRAMS & INITIATIVES
  // ─────────────────────────────────────────────
  {
    id: "doc-sdg-programs",
    category: "SDG Programs",
    title: "Greenville SDG 6 & 12 Community Programs",
    icon: "🌿",
    sdg: 0,
    color: "#95d5b2",
    chunks: [
      {
        id: "sdg-1",
        text: "Greenville is a signatory to the UN Sustainable Development Goals (SDGs). The city's 2030 Sustainability Plan commits to SDG 6 (Clean Water and Sanitation) by ensuring 100% safe water access, eliminating sewage overflows, and reducing per-capita water consumption by 20%. Progress is tracked annually at greenville.gov/sdg."
      },
      {
        id: "sdg-2",
        text: "Under SDG 12 (Responsible Consumption and Production), Greenville targets a 50% waste diversion rate by 2030 (currently at 38%). Key initiatives: expanding composting, increasing recycling education, eliminating single-use plastics in city operations, and partnering with local businesses on waste reduction programs."
      },
      {
        id: "sdg-3",
        text: "The Greenville Zero Waste School Program educates K-12 students on waste reduction, composting, and water conservation. Schools that achieve 75% waste diversion earn the Green School Certification and a $500 grant for environmental projects. Teachers can request a free waste audit kit at greenville.gov/schools-green."
      },
      {
        id: "sdg-4",
        text: "The Greenville Community Garden Network provides low-income residents with free raised garden beds and composting resources. 12 community gardens across the city offer shared composting bins, rainwater collection barrels, and soil testing. Register at greenville.gov/community-gardens. Waiting list open year-round."
      },
      {
        id: "sdg-5",
        text: "Greenville's Fix-It Clinic is a free monthly event where volunteers help residents repair broken electronics, clothing, furniture, and small appliances to extend their life and reduce waste. Events are held the second Sunday of each month at the Downtown Community Centre, 10am–2pm. No appointment needed."
      }
    ]
  },

  // ─────────────────────────────────────────────
  // COMPLAINTS & FEEDBACK
  // ─────────────────────────────────────────────
  {
    id: "doc-complaints",
    category: "Complaints & Feedback",
    title: "Filing Complaints & Service Requests",
    icon: "📋",
    sdg: 0,
    color: "#a8dadc",
    chunks: [
      {
        id: "complaints-1",
        text: "Greenville operates a unified 311 Customer Service Centre for all non-emergency municipal requests. Reach 311 by: calling 311 (within city limits) or 555-311-CITY (outside), texting 'GREENVILLE' to 31139, using the Greenville City app, or visiting greenville.gov/311. Hours: Mon–Fri 7am–8pm, Sat 8am–5pm. Emergency services: call 911."
      },
      {
        id: "complaints-2",
        text: "To file a formal complaint about any city service (water, waste collection, stormwater, etc.), submit a written complaint at greenville.gov/formal-complaint or mail to City Clerk, 1 City Hall Plaza, Greenville. Formal complaints receive a written response within 15 business days. You can escalate unresolved complaints to the City Ombudsman at 555-OMB-CITY."
      },
      {
        id: "complaints-3",
        text: "To report illegal dumping or littering in Greenville, call 555-GRN-DUMP or use the anonymous online report form at greenville.gov/illegal-dumping. Include photos and the location if possible. Reports are investigated within 5 business days. The city offers a $200 reward for information leading to the conviction of illegal dumpers."
      },
      {
        id: "complaints-4",
        text: "Environmental violations (illegal discharge, pollution, hazardous dumping) can be reported to the Greenville Environmental Enforcement Division at 555-ENV-GRNV or env.enforcement@greenville.gov. For immediate environmental emergencies (chemical spills, sewage overflow), call the 24-hour emergency line at 555-911-ENV. Whistleblower protections apply to all reporters."
      }
    ]
  }
];

// Export for use in app.js
window.KNOWLEDGE_BASE = KNOWLEDGE_BASE;
