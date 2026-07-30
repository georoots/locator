# GeoRoots Locator

Mobile-first, offline-capable GPS data collection and mapping tool for field surveys, farm mapping, geo traceability, and EUDR-related workflows.

GeoRoots Locator is designed first and foremost as an installable mobile field solution for phones and tablets. It helps field teams collect points and polygons, record structured metadata, capture supplemental areas such as a farm's complete boundary, review features on a map, and export the results as GeoJSON or CSV. The app can also run on desktop browsers for data review and management, but desktop use is secondary to the mobile collection workflow.

> **Beta disclaimer:** GeoRoots Locator is currently in Beta. Features, data structures, and workflows may change. Test the app on your intended devices and browsers before operational use, verify exported data independently, and keep regular GeoJSON backups. Do not rely on the app as the only copy of important survey data.

## Key Features

### GPS and map-based data collection

* Capture points from the device's current GPS location.
* Place points manually by selecting a location on the map.
* Capture polygons by walking to each corner and adding GPS vertices.
* Draw polygons by positioning the map and adding vertices manually.
* See the current GPS coordinates and reported accuracy while collecting.
* Tap the GPS status area in the bottom panel to re-center the map on the current location.
* Automatically calculate polygon area in hectares.

### Feature management and polygon editing

* Review collected features directly on the map.
* Search, inspect, edit, and delete collected features.
* Re-draw an existing polygon while preserving its metadata.
* Display feature properties in map popups.
* Store optional producer name, place reference, area, field notes, and profile-specific fields.

### Supplemental polygons

Some workflows require more than one boundary for the same farm. For example, the primary polygon may represent the coffee-producing area while a certification process also requires the complete farm area, including homes, other crops, and unused land.

Locator supports supplemental polygon fields for this purpose:

* Draw or capture the supplemental polygon separately from the primary feature.
* Re-draw or re-capture an existing supplemental polygon.
* Calculate and store its area automatically.
* Keep both the calculated area and the complete GeoJSON polygon in feature properties.
* Show or hide the supplemental polygon as a grey, non-interactive map overlay.
* Delete the supplemental polygon without deleting the primary feature.

The supplemental boundary is not used as the feature's main geometry. This keeps it as supporting information and avoids treating it as another overlapping feature in the exported dataset.

### Additional field profiles

The Settings panel can enable predefined groups of additional fields:

* **Basic** — visit outcome, identified issues, and approval.
* **Advanced** — inspector, certifications, contact details, address information, and total farm area.
* **Approval** — identified issues, approval status, approver, and approval date.
* **SCFCU Form** — producer and farm details, production figures, coffee tree count, non-compliances, inspector, and total farm area.

Fixed export properties can also be configured. These properties are added to every exported feature and overwrite an existing property with the same key.

### Offline maps and PWA support

* Install Locator on supported mobile devices for a standalone, field-ready interface.
* Cache selected map areas, layers, and zoom levels before travelling offline.
* Monitor download progress, estimated size, failed tiles, and device storage usage.
* View and remove individual downloaded map areas or clear the complete map cache.
* Use cached interface assets, translations, and downloaded map tiles without connectivity.
* Use PWA shortcuts to create a point, open the map, or manage offline maps.

Offline map coverage must be downloaded in advance. Some specialist overlays may have reduced functionality offline or may not exactly reproduce their online rendering.

#### iPhone and iPad storage limitation

iOS and iPadOS do not guarantee a fixed amount of storage to a PWA. The often-quoted **50 MB limit relates to older WebKit implementations and should not be treated as the current universal limit**. Modern WebKit versions use dynamic quotas based on device capacity, free space, browser context, operating-system version, and storage pressure. A Home Screen web app can generally use substantially more than 50 MB, but the actual amount available to Locator may still be lower than expected, writes can fail when the quota is reached, and stored data may be reclaimed by the operating system.

Before field deployment on an iPhone or iPad:

* Install Locator on the Home Screen and test it on the exact device and iOS/iPadOS version that will be used.
* Keep offline map areas and zoom ranges no larger than necessary.
* Check Locator's storage estimate and device free space before starting a download.
* Confirm that the downloaded area opens while the device is offline.
* Export GeoJSON backups regularly; browser storage must never be the only copy of survey data.

See [WebKit's current storage policy](https://webkit.org/blog/14403/updates-to-storage-policy/) for platform details.

### Maps and overlays

Locator includes several base-map choices and environmental overlays:

* OpenStreetMap street map.
* OpenTopoMap topographic map.
* Esri satellite imagery, including a 2020 Wayback layer.
* Global Forest Cover and Tree Cover Loss overlays.
* User-provided GeoJSON overlays with configurable colour and interactivity.

Map tiles and environmental layers are supplied by third parties and remain subject to their availability, coverage, attribution, and usage terms.

### Import, export, and sharing

* Import GeoJSON features into the working dataset.
* Load GeoJSON files as reference overlays without adding them as collected features.
* Export all features as a GeoJSON FeatureCollection.
* Export feature properties and geometry as CSV.
* Share GeoJSON through the device's native share interface where supported.
* Open supported GeoJSON and JSON files through PWA file handling on compatible platforms.

Always inspect exported files before submitting or sharing them. CSV is useful for tabular review, while GeoJSON preserves the complete geometry and is the recommended backup format.

### Languages

The interface is available in:

* English
* Spanish
* Portuguese
* Swahili

Language files are included in the offline application cache, so the interface language can be changed without an internet connection after the latest PWA version has been installed and activated.

### Local-first privacy

Collected features, settings, and downloaded map areas are stored locally in the browser on the user's device. GeoRoots Locator does not upload collected features to a GeoRoots server.

When the app is online, the browser still makes requests to third-party map and imagery providers to retrieve map tiles. Exported data leaves the device only when the user explicitly downloads or shares it.

## Usage

1. Open GeoRoots Locator in a supported browser.
2. On the mobile device that will be used in the field, install the app when prompted for easier access and a standalone interface.
3. Allow location access when the browser requests it.
4. Open **Settings** to choose a language and an additional-field profile.
5. If you expect to work without connectivity, open **Download Maps**, select the survey area, layers, and zoom range, and complete the download before going offline.
6. From the menu, choose **Add Point** or **Add Polygon**.
7. Enter the feature metadata and choose whether to capture from GPS or select/draw on the map.
8. For polygons, add at least three vertices and finish the shape.
9. If the selected field profile includes a supplemental polygon, capture or draw it from the feature form.
10. Review the result on the map or use **Manage Features** to search and edit the dataset.
11. Export GeoJSON regularly as a backup and when the survey is complete.

## Important Data and Accuracy Notes

* GPS accuracy depends on the device, satellite visibility, weather, buildings, vegetation, and other environmental conditions.
* The accuracy value displayed by Locator is reported by the device; it is not a guarantee that the recorded position is correct.
* Polygon area is calculated from the captured coordinates and inherits any GPS or drawing error.
* Clearing browser/site data, uninstalling the PWA, resetting the browser, or losing the device may permanently remove locally stored features and cached maps.
* Browser storage can be reclaimed by the operating system under storage pressure.
* Mobile storage quotas are controlled by the browser and operating system. They vary by device and version and may change without notice.
* Export GeoJSON frequently and store backups somewhere separate from the collection device.
* Validate boundaries, metadata, and area calculations before using them for certification, legal, compliance, payment, or land-tenure decisions.

## FAQ

##### Q: **Does Locator work completely offline?**

A: The application interface and translations work offline after the service worker has installed and activated. Map areas must be downloaded in advance. GPS itself does not require mobile data, although some devices may obtain a faster initial position when connected.

##### Q: **Is an iOS PWA limited to 50 MB of storage?**

A: Not as a universal current rule. The 50 MB figure comes from older WebKit behaviour. Current iOS and iPadOS versions use dynamic, percentage-based storage quotas, and Home Screen web apps can normally store more. The practical quota still depends on the device, free space, operating-system version, and storage pressure, so Locator cannot guarantee a specific capacity. Keep map downloads focused, test offline operation on the target device, and maintain external GeoJSON backups.

##### Q: **Where is my survey data stored?**

A: Features and settings are stored in browser storage on the current device. Downloaded map tiles are stored separately in the browser's local cache. There is no automatic cloud synchronization or server backup.

##### Q: **How should I back up my work?**

A: Export the dataset as GeoJSON regularly, especially after a field session. Keep the exported file on another device or in a storage location you trust. GeoJSON preserves geometry and properties more completely than CSV.

##### Q: **What is the difference between GPS capture and drawing on the map?**

A: GPS capture records the device's current positions and is intended for walking or visiting the surveyed locations. Map drawing lets the user position vertices manually and can be useful when a visible boundary is clear on the selected base map. Both methods require verification.

##### Q: **What is a supplemental polygon?**

A: It is a second boundary stored as a property of the primary feature. It can represent information such as total farm area while the main feature geometry represents only the producing plot. The supplemental boundary and its calculated area are exported with the feature but do not replace its main geometry.

##### Q: **Can existing polygons be changed?**

A: Yes. Open the feature in **Manage Features** and use **Re-draw** to replace its geometry. Supplemental polygons can also be re-drawn or re-captured from GPS.

##### Q: **Can I use my own map data?**

A: GeoJSON files can be loaded as custom overlays. They are intended as visual references and can be made interactive or non-interactive. Imported overlays are kept separate from the collected feature dataset.

##### Q: **Which import formats are supported?**

A: Locator accepts GeoJSON or compatible JSON containing a FeatureCollection, a Feature, or a supported GeoJSON geometry. Invalid or unsupported features are not imported.

##### Q: **Why is my GPS position inaccurate or unavailable?**

A: Confirm that location permission is enabled, move outdoors with a clear view of the sky, disable battery-saving restrictions if necessary, and wait for the accuracy value to improve. Device hardware and local conditions can limit the result.

##### Q: **What happens if I clear browser data?**

A: Locally stored features, settings, custom overlays, and downloaded maps may be deleted. Restore the survey from a previously exported GeoJSON file where possible.

##### Q: **My language is not included. Can it be added?**

A: Yes. Open an issue with the requested language. Contributions that improve existing translations are also welcome.

##### Q: **Is Locator ready for production use?**

A: Locator is in Beta. Organisations should test their complete collection, review, backup, and export workflow before deployment. Use appropriate independent quality checks and do not treat the app as a substitute for professional surveying, legal advice, or certification guidance.

## Running Locally

Locator has no build step or package dependencies. Because service workers and browser geolocation require a secure context, serve the repository through `localhost` during development instead of opening `index.html` directly:

```sh
python -m http.server 8080
```

Then open `http://localhost:8080/` in a supported browser.

For production, deploy all repository assets together over HTTPS, including `index.html`, `sw.js`, `manifest.json`, icons, and translation files.

## Mobile-First Device and Browser Support

Locator is primarily designed for current mobile phones and tablets with support for JavaScript, Geolocation, IndexedDB, local storage, and service workers. The intended workflow is to install the PWA on the field device, prepare offline maps before travel, collect data using the device GPS, and export backups from that device.

Desktop browsers are supported for reviewing, editing, importing, and exporting data, but the interface and operational workflow are optimised for mobile field collection rather than desktop GIS use.

Installation, native sharing, file handling, protocol handling, storage quotas, GPS behaviour, and background operation vary by browser and operating system. Test the exact mobile browser, device model, and OS version intended for field use. Keep devices updated and confirm that power-saving settings do not suspend GPS collection or long offline-map downloads.

## About GeoRoots: Open Source Toolkit for EUDR Compliance and Geo Traceability

GeoRoots is a collection of minimalistic, open-source tools designed for EU Deforestation Regulation (EUDR) workflows and improved geo traceability.

Our philosophy is simple: provide useful tools that respect privacy, work offline where possible, and require no complex setup or subscription fees.

### Why Use GeoRoots?

* **Privacy focused** — collected data remains under the user's control.
* **Open source** — the code can be inspected, adapted, and improved.
* **Offline ready** — tools are designed for locations with unreliable connectivity.
* **Mobile first** — collection workflows are designed primarily for phones and tablets used in the field.
* **Accessible** — no subscription or specialised server infrastructure is required.

### Perfect for:

* Producers and cooperatives
* Smaller traders and exporters
* Importers and operators
* Field enumerators and inspectors
* Sustainability and certification teams
* Geo-traceability projects

### Useful Resources

* [GeoRoots](https://georoots.eu/)
* [EUDR DDS on LIVE Environment](https://eudr.webcloud.ec.europa.eu/tracesnt/)
* [EUDR DDS on TEST Environment](https://acceptance.eudr.webcloud.ec.europa.eu/tracesnt/)
* [EUDR Information System on the Green Forum](https://green-forum.ec.europa.eu/deforestation-regulation-implementation/information-system-deforestation-regulation_en)
* [EUDR on EUR-Lex](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1115)
* [WebKit Storage Policy](https://webkit.org/blog/14403/updates-to-storage-policy/)

### Contributing

Contributions are welcome. Open an issue to report a bug, suggest an improvement, request a language, or discuss a proposed change. Pull requests should be focused, clearly described, and tested on relevant mobile devices first, with desktop regression testing where applicable.

### Contact

For questions or feedback, open an issue on this repository or contact [info@georoots.eu](mailto:info@georoots.eu).