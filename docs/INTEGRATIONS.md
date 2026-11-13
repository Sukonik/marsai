# MARSAI integrations: live data and your other projects

The crew can answer with live, useful data. Every source is free and needs no key. Each is shown with its source, date, and a link, and each fails gracefully: one source being down never breaks a reply, and a missing value is left out instead of shown as zero.

Turn all web data off with the **Web data** switch in Subsystems (or say "turn off web lookups"). Every request is written to the system log (Settings). Nothing you type is sent to these sources except the place name, ticker, or topic you ask about.

| Ask | Source | Notes |
| --- | --- | --- |
| "Do I need an umbrella in Seattle?", "weather here" | **Open-Meteo** forecast, air quality, and geocoding, the same sources as [ClearSky](https://github.com/Sukonik/weather-app) | Temperature, feels like, wind and gusts, humidity, today's high and low, rain chance, UV peak, air quality (US AQI), sunrise and sunset. Links to ClearSky for hourly, tides, and moon. Attribution: Weather data by Open-Meteo.com (CC BY 4.0) |
| "Price of SCHD", "what does VYM pay", "how is Apple stock doing" | **[Payout Lab](https://github.com/Sukonik/payout-lab)** daily data file (Yahoo Finance via Payout Lab, refreshed several times a day) | Price, yearly dividends, yield, schedule (monthly, quarterly, twice or once a year), last ex-dividend date and payment, 5-year growth, source and update date. Pay months are estimates from ex-dates. Educational data, not investment advice. Links to Payout Lab |
| "Any AI news?", "news about OpenAI" | **[GoldBrief](https://github.com/Sukonik/goldbrief)** curated news (and its automated headlines when nothing curated matches, clearly labeled "Automated / unreviewed") | Newest first, each with source, date, and label. GoldBrief's feed is curated, not live. Links to GoldBrief |
| "What is hallucination?", "define agent" | **GoldBrief glossary** (22 plain-language AI terms) | Falls back to Wikipedia for other terms |
| "Who is Ada Lovelace?", "tell me about black holes" | **Wikipedia** | Short summary plus related links and a web search link |
| "Take a message: Phil Gordon 516-787-9090 SWA Development wants to speak to law staff, urgent", "show my messages" | **[WYWO](https://github.com/Sukonik/wywo)** quick-type parser (vendored) | Sorts plain words into caller, company, phone, who it is for, urgency, and topics. Saved on this device only. Links to WYWO to print or export the note |
| "Open payout lab", "open the weather app", "open goldbrief", "open wywo" | Your sibling apps | Opens the live apps in a new tab |

## Notes on the sibling projects

- **WYWO's parser** (`site/assets/vendor/wywo-quicktype.js`) is copied unmodified under its own MPL-2.0 license; see `site/assets/vendor/README.md`. Update it by copying the newer file.
- The data files are read over HTTPS from each project's GitHub Pages site (`sukonik.github.io/...`), which allows browser requests. If a project moves, update `URLS` in `site/assets/webdata.js`.
- Payout Lab's price source is unofficial and unlicensed for commercial use (see Payout Lab's `docs/data-sources.md`). MARSAI shows the source and date with every quote and links back.
- GoldBrief's editorial rules are preserved: every item carries its source, date, and a label, and automated headlines are never presented as fact-checked.

## Tests

`tests/js/webdata.test.js` runs every source against fixtures made from the real data files, including failures (air-quality outage, rate limits, missing fields, unknown tickers) and caching.
