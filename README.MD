# Ali-Express Order Downloader

Since Ali Express doesn't have a way of downloading orders from their site, I created this set of scripts that can be ran using TamperMonkey or GreaseMonkey. One script is for the order list page (export multiple orders with basic order data), the other is for the order detail page (export individual orders with product details).

Orders are exported by way of copying the data to the clipboard in tab delimited format. You can then paste the data into a spreadsheet.

**Actual quantity when ordering bulk (pieces per pack):** The script will look for keywords (ie: 'pieces' or 'pcs') in both the product Title and product Option to determine if a single product actually contains multiple items. To prevent some products from this quantity check, use a list of exclusions to filter out product Title and product Options that contain keywords.

**Calculated Landed Cost:** The script will calculate the landed cost (cost of goods sold) of an individual item using the following calculation. This is helpful when using this data in calculating inventory costs and for purchase orders.

`(((productPrice * productQuantity) / order.subtotal).toFixed(2) * order.total) / (productQuantity * productPcsPerPack)`

## Buttons Added to Page:

### Copy Header Row
This button copies the header row of column names to the clipboard. Paste this as the first row in your spreadsheet.

### Copy Order(s) To clipboard
This button will copy either the individual order (on the order detail page) or all visible orders (on the order list page), to the clipboard. If you click "View More Orders" at the end of the order list, you will need to click the Show Tracking Numbers/Rescan Orders button to rescan the page for orders.

**Order List Limitation:** Due to the way Ali Express displays orders with multiple items on an order (by showing only an image rather than product title, price, etc.), only orders with a single item will have product data included. I will try to find a work around in a future version of the script.

### Show Tracking Numbers/Rescan Orders
This button will display tracking numbers for all visible orders. If you click "View More Orders" at the end of the order list, you will need to click the Show Tracking Numbers/Rescan Orders button to rescan the page for orders.

## Data Export

### Order Detail Page (single order)

- Order Number
- Order Date
- Subtotal
- Shipping and Tax
- Total Order Amount
- Store Name
- Order Status
- Tracking Number
- Tracking Status
- Status Last Updated
- Tracking Link
- Product Title
- Option
- Price
- Quantity
- Pieces Per Pack
- Total Quantity
- Landed Cost
- Product URL
- Image URL

### Order List Page (multiple orders)
- Order Number
- Order Date
- Total Order Amount
- Store Name
- Product URL
- Image URL

Orders with only 1 item:
- Product Title
- Option
- Price
- Quantity
- Pieces Per Pack
- Total Quantity
- Landed Cost

Coming in a future version of the script:
- Order Status
- Tracking Number
- Tracking Status
- Status Last Updated
- Tracking Link

## Requirements

You will need to install either the TamperMonkey or Greasemonkey extensions for your browser. Create two new scripts and paste in the code from each of the scripts here.

[Install TamperMonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en)
