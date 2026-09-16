import { NextRequest, NextResponse } from 'next/server'
import { buildIdeasSystemPrompt, buildIdeasUserPrompt } from '@/lib/prompts'

// ─── Sample Ideas fallback (no API key) ────────────────────────────────────────
function buildFallbackIdeas(label: string): object[] {
  return [
    {
      id: 'smart-water-monitor',
      title: 'Smart Water Quality Monitor',
      category: 'hybrid',
      difficulty: 'medium',
      localProblem: `Many communities near ${label} face challenges with water quality monitoring. Manual testing is infrequent and expensive.`,
      whyHere: `Local hardware stores and electronics shops in ${label} likely carry Arduino-compatible sensors. Water quality is universally relevant.`,
      softwareSketch: 'Arduino firmware + MQTT broker + React dashboard + alerting via WhatsApp API',
      hardwareSketch: 'Arduino Uno, pH sensor, TDS sensor, turbidity sensor, ESP8266 WiFi module, waterproof enclosure',
      bomPreview: ['Arduino Uno', 'pH Sensor Module', 'TDS Meter Sensor', 'ESP8266 NodeMCU', 'Waterproof Junction Box'],
      suggestedResources: ['Electronics store', 'Makerspace with soldering equipment'],
      tags: ['iot', 'water', 'environment', 'sensors'],
    },
    {
      id: 'local-crop-advisor',
      title: 'AI Crop Disease Advisor',
      category: 'software',
      difficulty: 'medium',
      localProblem: `Farmers near ${label} often struggle to identify crop diseases early, leading to significant losses.`,
      whyHere: `Mobile-first solution works even with limited internet. Locally trained model on common regional crops.`,
      softwareSketch: 'React Native app + TensorFlow Lite model + offline-first SQLite + optional cloud sync',
      hardwareSketch: '',
      bomPreview: [],
      suggestedResources: ['Agricultural extension offices', 'Local farmers market'],
      tags: ['ai', 'agriculture', 'mobile', 'offline'],
    },
    {
      id: 'community-mesh-network',
      title: 'Low-Cost Community Mesh Network',
      category: 'hybrid',
      difficulty: 'hard',
      localProblem: `Internet connectivity in rural areas near ${label} is expensive or unreliable, limiting digital access.`,
      whyHere: `LoRa radio modules are inexpensive and work over long distances without cellular infrastructure.`,
      softwareSketch: 'Meshtastic firmware + custom web portal + community message board + emergency alerts',
      hardwareSketch: 'Raspberry Pi, LoRa HAT (SX1276), directional antenna, solar panel + battery, weatherproof case',
      bomPreview: ['Raspberry Pi 4', 'LoRa SX1276 Module', '5W Solar Panel', '18650 Battery Pack', 'Weatherproof Enclosure'],
      suggestedResources: ['Makerspace', 'Electronics store', 'Community center'],
      tags: ['networking', 'lora', 'community', 'solar'],
    },
    {
      id: 'pothole-reporter',
      title: 'Pothole & Road Damage Reporter',
      category: 'software',
      difficulty: 'easy',
      localProblem: `Poor road conditions near ${label} cause vehicle damage and accidents. City councils lack real-time data.`,
      whyHere: `Civic tech solution that can be deployed quickly and integrated with local government reporting systems.`,
      softwareSketch: 'Next.js PWA + GPS + camera API + PostGIS database + open311 API integration + heatmap dashboard',
      hardwareSketch: '',
      bomPreview: [],
      suggestedResources: ['Local municipality offices', 'Community volunteers'],
      tags: ['civic', 'mobile', 'gps', 'maps'],
    },
    {
      id: 'solar-charge-tracker',
      title: 'Solar Charging Station Tracker',
      category: 'hybrid',
      difficulty: 'easy',
      localProblem: `Power outages are common near ${label}. Solar charging stations are underutilized due to lack of visibility.`,
      whyHere: `Affordable microcontroller + display creates a visible, helpful public utility.`,
      softwareSketch: 'ESP32 firmware + OLED display + Flask REST API + map web app showing real-time station status',
      hardwareSketch: 'ESP32, INA219 current sensor, OLED display, 5V relay module',
      bomPreview: ['ESP32 Dev Board', 'INA219 Current Sensor', 'SSD1306 OLED Display', '5V Relay Module'],
      suggestedResources: ['Electronics store', 'Solar supplier'],
      tags: ['solar', 'iot', 'energy', 'esp32'],
    },
    {
      id: 'offline-school-library',
      title: 'Offline Digital School Library',
      category: 'hybrid',
      difficulty: 'medium',
      localProblem: `Schools near ${label} lack textbooks and educational resources. Internet access in schools is unreliable.`,
      whyHere: `Raspberry Pi can serve thousands of textbooks and videos offline to students via WiFi without internet.`,
      softwareSketch: 'KA-Lite / Rachel-Plus + custom catalog UI + EPUB reader + video player + teacher dashboard',
      hardwareSketch: 'Raspberry Pi 4, 256GB SSD, USB WiFi hotspot adapter, 12V battery + solar',
      bomPreview: ['Raspberry Pi 4 (8GB)', '256GB SSD', 'USB WiFi Adapter', 'Solar Power Bank'],
      suggestedResources: ['NGOs', 'Electronics store', 'Schools'],
      tags: ['education', 'offline', 'raspberry-pi', 'solar'],
    },
    {
      id: 'air-quality-station',
      title: 'Hyperlocal Air Quality Station',
      category: 'hybrid',
      difficulty: 'easy',
      localProblem: `Air pollution levels in ${label} often go unmeasured at a neighborhood level. Official monitoring stations are sparse.`,
      whyHere: `Low-cost PM2.5 sensors can map air quality street by street and feed an open data portal.`,
      softwareSketch: 'Arduino/ESP32 firmware + InfluxDB + Grafana dashboard + public API',
      hardwareSketch: 'ESP32, PMS5003 PM2.5 sensor, BME280 temperature/humidity, 3D-printed enclosure',
      bomPreview: ['ESP32 Dev Board', 'PMS5003 PM2.5 Sensor', 'BME280 Sensor', '3D-Printed Case'],
      suggestedResources: ['Makerspace with 3D printer', 'Electronics store'],
      tags: ['environment', 'air-quality', 'iot', 'open-data'],
    },
    {
      id: 'local-barter-platform',
      title: 'Neighborhood Skills & Barter Platform',
      category: 'software',
      difficulty: 'easy',
      localProblem: `Communities near ${label} have skilled individuals who could exchange services, but lack a trusted local platform.`,
      whyHere: `A hyperlocal, mobile-first PWA with WhatsApp integration fits the local communication norms.`,
      softwareSketch: 'Next.js + Supabase (auth + DB) + WhatsApp Business API + geofenced listings + ratings',
      hardwareSketch: '',
      bomPreview: [],
      suggestedResources: ['Local community centers', 'NGOs'],
      tags: ['community', 'platform', 'web', 'whatsapp'],
    },
    {
      id: 'waste-sorting-robot',
      title: 'AI Waste Sorting Assistant',
      category: 'hybrid',
      difficulty: 'hard',
      localProblem: `Improper waste segregation near ${label} leads to landfill overflow and recycling inefficiency.`,
      whyHere: `Camera + ML model can classify waste types in real-time, training locals on proper sorting.`,
      softwareSketch: 'Raspberry Pi + TensorFlow Lite + camera + LED indicator + stats dashboard',
      hardwareSketch: 'Raspberry Pi 4, Pi Camera Module, RGB LED strip, servo motor, sorting bin frame',
      bomPreview: ['Raspberry Pi 4', 'Pi Camera V2', 'Servo Motor', 'RGB LED Strip', 'Acrylic Frame'],
      suggestedResources: ['Makerspace', '3D printing service', 'Electronics store'],
      tags: ['waste', 'ml', 'environment', 'robotics'],
    },
    {
      id: 'flood-early-warning',
      title: 'Flood Early Warning System',
      category: 'hybrid',
      difficulty: 'hard',
      localProblem: `Seasonal flooding near ${label} displaces communities and damages property with little warning.`,
      whyHere: `Ultrasonic water level sensors + LoRa transmission enables low-power early warning across wide areas.`,
      softwareSketch: 'Arduino + LoRa + Raspberry Pi gateway + SMS alerts via Twilio + public dashboard',
      hardwareSketch: 'Arduino Nano, HC-SR04 ultrasonic sensor, LoRa SX1278, solar + battery, waterproof case',
      bomPreview: ['Arduino Nano', 'HC-SR04 Sensor', 'LoRa SX1278', 'Solar Panel 6V', 'IP67 Enclosure'],
      suggestedResources: ['Electronics store', 'Local disaster management office'],
      tags: ['flood', 'disaster', 'iot', 'lora', 'sms'],
    },
    {
      id: 'local-health-tracker',
      title: 'Community Health Symptom Tracker',
      category: 'software',
      difficulty: 'medium',
      localProblem: `Disease outbreaks in ${label} spread silently because there is no early community reporting system.`,
      whyHere: `Anonymous symptom reporting via WhatsApp/USSD enables real-time disease surveillance.`,
      softwareSketch: 'Node.js + PostgreSQL + USSD gateway + WhatsApp Bot + choropleth outbreak map',
      hardwareSketch: '',
      bomPreview: [],
      suggestedResources: ['Local health clinic', 'NGO health workers'],
      tags: ['health', 'ussd', 'whatsapp', 'surveillance'],
    },
    {
      id: 'school-attendance-ble',
      title: 'BLE School Attendance System',
      category: 'hybrid',
      difficulty: 'medium',
      localProblem: `Manual attendance in schools near ${label} is time-consuming and error-prone, especially in large classes.`,
      whyHere: `Bluetooth LE beacons in student ID cards auto-register attendance as students enter class.`,
      softwareSketch: 'Raspberry Pi scanner + SQLite + Flask API + SMS parent alerts + teacher web dashboard',
      hardwareSketch: 'Raspberry Pi 3, BLE USB dongle, BLE iBeacon tags (one per student)',
      bomPreview: ['Raspberry Pi 3B+', 'BLE USB Dongle', 'iBeacon Tags x30', 'USB Power Supply'],
      suggestedResources: ['Electronics store', 'Schools', 'PTA'],
      tags: ['education', 'bluetooth', 'iot', 'school'],
    },
    {
      id: 'smart-traffic-lights',
      title: 'Adaptive Traffic Light Controller',
      category: 'hybrid',
      difficulty: 'hard',
      localProblem: `Fixed-phase traffic lights near ${label} cause unnecessary congestion during off-peak hours.`,
      whyHere: `Computer vision on a Raspberry Pi detects vehicle density and adapts green-phase duration dynamically.`,
      softwareSketch: 'Pi + OpenCV + YOLO v8 + relay controller + traffic management API',
      hardwareSketch: 'Raspberry Pi 4, Pi Camera, 4-channel relay module, weatherproof enclosure',
      bomPreview: ['Raspberry Pi 4 (4GB)', 'Pi Camera V2', '4-Channel Relay', 'IP65 Enclosure', 'LED Traffic Signals'],
      suggestedResources: ['City traffic authority', 'Makerspace', 'Electronics store'],
      tags: ['traffic', 'computer-vision', 'raspberry-pi', 'civic'],
    },
    {
      id: 'village-telemedicine',
      title: 'Village Telemedicine Kiosk',
      category: 'hybrid',
      difficulty: 'hard',
      localProblem: `Rural communities near ${label} travel hours to access basic healthcare due to doctor shortages.`,
      whyHere: `A ruggedized kiosk with vitals sensors + video call enables remote consultations at village level.`,
      softwareSketch: 'Raspberry Pi OS + video call (Jitsi) + vitals dashboard + EHR integration',
      hardwareSketch: 'Raspberry Pi 4, 10" touchscreen, pulse oximeter, BP cuff, temperature sensor, 4G modem',
      bomPreview: ['Raspberry Pi 4', '10" Touchscreen', 'MAX30100 Pulse Oximeter', '4G LTE Modem', 'Pelican Case'],
      suggestedResources: ['NGO health programs', 'Makerspace', 'Telecom provider'],
      tags: ['health', 'telemedicine', 'raspberry-pi', 'rural'],
    },
    {
      id: 'ussd-market-prices',
      title: 'USSD Commodity Price Info Service',
      category: 'software',
      difficulty: 'easy',
      localProblem: `Farmers and traders near ${label} have no reliable way to check market prices before selling.`,
      whyHere: `USSD works on any phone without internet, making it universally accessible in the region.`,
      softwareSketch: 'Node.js + Africa\'s Talking USSD API + PostgreSQL + daily price scraper + SMS alerts',
      hardwareSketch: '',
      bomPreview: [],
      suggestedResources: ['Local market committee', 'Telecom provider', 'Agriculture ministry'],
      tags: ['ussd', 'agriculture', 'prices', 'mobile'],
    },
    {
      id: 'smart-irrigation',
      title: 'Solar-Powered Smart Irrigation',
      category: 'hybrid',
      difficulty: 'medium',
      localProblem: `Farmers near ${label} over-water or under-water crops due to lack of soil moisture feedback.`,
      whyHere: `ESP32 + soil sensors automate irrigation with solar power — no grid needed.`,
      softwareSketch: 'ESP32 firmware + MQTT + Node-RED dashboard + weather API integration',
      hardwareSketch: 'ESP32, capacitive soil moisture sensor, solenoid valve, 12V solar + battery, relay',
      bomPreview: ['ESP32', 'Soil Moisture Sensor', 'Solenoid Valve 12V', '20W Solar Panel', '12V Battery'],
      suggestedResources: ['Agriculture store', 'Electronics store', 'Solar supplier'],
      tags: ['agriculture', 'solar', 'iot', 'irrigation'],
    },
    {
      id: 'waste-pickup-app',
      title: 'Community Waste Pickup Scheduler',
      category: 'software',
      difficulty: 'easy',
      localProblem: `Irregular waste collection near ${label} causes garbage build-up and health hazards.`,
      whyHere: `A lightweight PWA lets residents schedule pickups and track the collection truck in real time.`,
      softwareSketch: 'Next.js PWA + Supabase + Google Maps API + push notifications + route optimizer',
      hardwareSketch: '',
      bomPreview: [],
      suggestedResources: ['Municipality waste dept', 'Community leaders'],
      tags: ['civic', 'waste', 'pwa', 'mobile'],
    },
    {
      id: 'noise-pollution-monitor',
      title: 'Noise Pollution Mapping Network',
      category: 'hybrid',
      difficulty: 'medium',
      localProblem: `Construction, traffic, and industry noise near ${label} is unmonitored and exceeds safe limits.`,
      whyHere: `A network of cheap MEMS microphones can map noise levels across the city and feed open data.`,
      softwareSketch: 'ESP32 firmware + time-series DB + Grafana noise map + government API',
      hardwareSketch: 'ESP32, INMP441 MEMS microphone, 3D-printed weatherproof case',
      bomPreview: ['ESP32', 'INMP441 Microphone', '3D-Printed Case', 'USB Power Adapter'],
      suggestedResources: ['Makerspace', 'Municipality environment dept'],
      tags: ['noise', 'environment', 'iot', 'open-data'],
    },
    {
      id: 'blind-navigation-assist',
      title: 'Blind Navigation Cane with Obstacle Alerts',
      category: 'hybrid',
      difficulty: 'medium',
      localProblem: `Footpaths and public spaces near ${label} are poorly maintained, creating hazards for visually impaired people.`,
      whyHere: `Ultrasonic + vibration haptic feedback on a cane costs under $20 to build.`,
      softwareSketch: 'Arduino firmware + haptic feedback logic + optional BLE location beacon integration',
      hardwareSketch: 'Arduino Nano, HC-SR04 ultrasonic sensor, vibration motor, 9V battery, aluminium cane',
      bomPreview: ['Arduino Nano', 'HC-SR04 Sensor', 'Vibration Motor', '9V Battery', 'Aluminium Rod'],
      suggestedResources: ['Makerspace', 'Disability NGO', 'Electronics store'],
      tags: ['accessibility', 'arduino', 'iot', 'social'],
    },
    {
      id: 'local-job-board-ussd',
      title: 'Local Jobs Board via WhatsApp & USSD',
      category: 'software',
      difficulty: 'easy',
      localProblem: `Youth unemployment near ${label} is high partly because local job vacancies are not visible online.`,
      whyHere: `WhatsApp + USSD bridges the gap between businesses posting jobs and youth without smartphones.`,
      softwareSketch: 'Node.js + WhatsApp Business API + Africa\'s Talking USSD + PostgreSQL + simple admin panel',
      hardwareSketch: '',
      bomPreview: [],
      suggestedResources: ['Youth empowerment NGOs', 'Local businesses', 'Chamber of commerce'],
      tags: ['jobs', 'whatsapp', 'ussd', 'social-impact'],
    },
    {
      id: 'cold-chain-tracker',
      title: 'Cold Chain Temperature Logger',
      category: 'hybrid',
      difficulty: 'medium',
      localProblem: `Medicines and perishable foods transported near ${label} spoil due to broken cold chains with no monitoring.`,
      whyHere: `A low-cost GPS + temperature logger in a shipment reveals exactly where the chain breaks.`,
      softwareSketch: 'ESP32 firmware + MQTT + web dashboard + email/SMS alert on threshold breach',
      hardwareSketch: 'ESP32, DS18B20 waterproof temperature sensor, GPS Neo-6M, SIM800L GPRS, LiPo battery',
      bomPreview: ['ESP32', 'DS18B20 Sensor', 'Neo-6M GPS', 'SIM800L Module', 'LiPo 3000mAh'],
      suggestedResources: ['Electronics store', 'Logistics companies', 'Pharma NGOs'],
      tags: ['cold-chain', 'gps', 'iot', 'health', 'logistics'],
    },
    {
      id: 'marketplace-price-scraper',
      title: 'Local Price Comparison Engine',
      category: 'software',
      difficulty: 'easy',
      localProblem: `Consumers near ${label} overpay for goods because prices vary widely across local markets with no visibility.`,
      whyHere: `A crowdsourced price database with a simple mobile UI empowers buyers to shop smart.`,
      softwareSketch: 'Next.js PWA + Supabase + crowdsourced submissions + price trend charts + WhatsApp share',
      hardwareSketch: '',
      bomPreview: [],
      suggestedResources: ['Local markets', 'Consumer rights NGOs'],
      tags: ['consumer', 'crowdsource', 'pwa', 'mobile'],
    },
    {
      id: 'solar-lantern-library',
      title: 'Solar Lantern Lending Library',
      category: 'hybrid',
      difficulty: 'easy',
      localProblem: `Students near ${label} cannot study after dark due to lack of electricity, harming educational outcomes.`,
      whyHere: `A managed lending system for solar lanterns + a tracking app reduces theft and ensures maximum utilization.`,
      softwareSketch: 'React Native app + QR code checkout system + Firebase + SMS notifications',
      hardwareSketch: 'Solar lanterns (D.light S300), QR code tags, Raspberry Pi checkout station',
      bomPreview: ['D.light S300 Solar Lanterns x20', 'QR Code Tags', 'Raspberry Pi 3B+', 'USB Barcode Scanner'],
      suggestedResources: ['Schools', 'NGOs', 'Solar supplier'],
      tags: ['solar', 'education', 'lending', 'community'],
    },
    {
      id: 'smart-bus-tracker',
      title: 'Real-Time Public Bus Tracker',
      category: 'hybrid',
      difficulty: 'medium',
      localProblem: `Commuters near ${label} waste hours waiting for buses with no visibility into arrival times.`,
      whyHere: `A $15 GPS tracker on each bus + a map web app transforms the commuter experience at minimal cost.`,
      softwareSketch: 'Node.js + MQTT + Redis + Mapbox GL JS map + mobile PWA + driver app',
      hardwareSketch: 'ESP32 + GPS Neo-6M + SIM800L + LiPo battery + vehicle-mounted enclosure',
      bomPreview: ['ESP32', 'Neo-6M GPS', 'SIM800L GPRS', 'LiPo Battery', 'Acrylic Enclosure'],
      suggestedResources: ['Bus operators association', 'City transport authority', 'Electronics store'],
      tags: ['transport', 'gps', 'realtime', 'civic'],
    },
  ]
}


// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { location, apiKey: clientApiKey, groqModel: clientModel, tavilyApiKey: clientTavilyKey } = body as {
      location: {
        lat: number
        lon: number
        label: string
        country: string
        resources: Array<{ name: string; type: string; distance: number }>
      }
      apiKey?: string
      groqModel?: string
      tavilyApiKey?: string
    }

    if (!location?.lat || !location?.lon) {
      return NextResponse.json({ error: 'Location required' }, { status: 400 })
    }

    // ── Resolve API key (server env > client-provided) ─────────────────────
    const apiKey = process.env.GROQ_API_KEY || clientApiKey || ''
    const baseUrl = 'https://api.groq.com/openai/v1'
    const model = process.env.GROQ_MODEL || clientModel || 'llama-3.3-70b-versatile'

    // ── No API key — return fallback ideas ───────────────────────────────────
    if (!apiKey) {
      const fallback = buildFallbackIdeas(location.label)
      return NextResponse.json({ ideas: fallback, fallback: true })
    }

    // ── Fetch real local problems from internet (Tavily) ────────────────────
    const tavilyKey = process.env.TAVILY_API_KEY || clientTavilyKey || ''
    let realProblems: Array<{ title: string; summary: string; category: string; severity: string; source: string; url: string }> = []
    if (tavilyKey) {
      try {
        const baseOrigin = req.nextUrl.origin
        const problemsRes = await fetch(`${baseOrigin}/api/problems`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            label: location.label,
            country: location.country,
            tavilyApiKey: tavilyKey,
            numQueries: 5,
          }),
          signal: AbortSignal.timeout(20000),
        })
        if (problemsRes.ok) {
          const pd = await problemsRes.json()
          realProblems = pd.problems || []
        }
      } catch (err) {
        console.warn('[ideas] Tavily search failed, continuing without real problems:', err)
      }
    }

    // ── LLM Request ──────────────────────────────────────────────────────────
    const systemPrompt = buildIdeasSystemPrompt()
    const userPrompt = buildIdeasUserPrompt({
      label: location.label,
      country: location.country,
      lat: location.lat,
      lon: location.lon,
      resources: location.resources,
      realProblems,
    })

    const llmRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.85,
        max_tokens: 8000,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(60000),
    })

    if (!llmRes.ok) {
      const errText = await llmRes.text()
      console.error('[ideas] LLM error:', errText)
      // Fallback on LLM error
      const fallback = buildFallbackIdeas(location.label)
      return NextResponse.json({ ideas: fallback, fallback: true, llmError: errText })
    }

    const llmData = await llmRes.json()
    const rawContent = llmData.choices?.[0]?.message?.content || ''

    let ideas: unknown[] = []
    try {
      const parsed = JSON.parse(rawContent)
      // Handle both {ideas: [...]} and direct array responses
      ideas = Array.isArray(parsed) ? parsed : (parsed.ideas || parsed.results || Object.values(parsed)[0] || [])
    } catch {
      console.error('[ideas] JSON parse error, using fallback')
      ideas = buildFallbackIdeas(location.label)
      return NextResponse.json({ ideas, fallback: true })
    }

    return NextResponse.json({ ideas, fallback: false, realProblems })
  } catch (err) {
    console.error('[ideas] route error:', err)
    return NextResponse.json(
      { error: 'Failed to generate ideas', details: String(err) },
      { status: 500 }
    )
  }
}
