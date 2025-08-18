# **App Name**: InventoMax

## Core Features:

- Create Voucher: Add a new raw material purchase to the voucher (inventory) collection, calculating the total price based on quantity and price per unit.
- Define Production Process: Define a production process (recipe), calculate ingredient quantities and costs, and create withdrawal entries in the voucher collection.
- Finalize Output: Finalize the output, calculating the final average price of the finished product considering scrape and processing charges.
- Record Sale: Record a sale and calculate the total revenue based on quantity sold and sale price per unit.
- View Vouchers (Inventory Ledger): Display a detailed ledger for a raw material, filtering and aggregating transactions to show available stock and average price, as well as individual entries.
- View Processes (Production History): Show the details of past production runs, filtering and grouping ingredients to display the recipe and cost per unit for each batch.
- View Outputs (Finished Goods Ledger): Provide a complete history for a finished product, merging production and sales data into a single view with totals produced, sold, and available stock.
- Alter Voucher: Find an existing raw material purchase and correct or delete it.
- Alter Process: Modify a production recipe, reversing original inventory changes and applying new ones to ensure stock counts are accurate. This feature uses a tool which performs actions as a single transaction.
- Alter Output: Correct the details of a finished goods entry.
- Setup Database: Sets up the local SQLite database and creates the four main tables (vouchers, recipes, outputs, sales) if they don't already exist.
- Show Info Popup: Displays a standardized pop-up message to the user for success or error messages.
- Wire Focus On Enter: Links a list of text input fields together so that when the user presses the 'Enter' key in one field, the cursor automatically jumps to the next one.
- Uppercase Text Input: Custom TextInput that automatically converts any text typed into uppercase.
- Color Label: A label that can have a solid background color, used for highlighting totals and table headers.
- Read Only Input: A text input field that the user cannot type into directly, populated by clicking a button.
- Calendar Popup: A complete, reusable pop-up window that displays a calendar for easy date selection.
- Frontpage: The main menu with 'Create', 'View', and 'Alt' buttons.
- Create: A sub-menu with 'Voucher', 'Process', and 'Output' buttons.
- View: A sub-menu with 'View Vouchers', 'View Processes', and 'View Outputs' buttons.
- Alt: A sub-menu with 'Alt Voucher', 'Alt Process', and 'Alt Output' buttons.
- Create Voucher Screen: To record the purchase of new raw materials, opens the calendar pop-up to select a date and saves the data to the vouchers table.
- Create Process Screen: To define a production recipe, dynamically adds rows to the recipe form, fetches average purchase prices, checks current stock, and saves the recipe details to the recipes table.
- Create Output Screen: To finalize a production run, calculates the final average price per unit of the finished good and saves the finalized production data to the outputs table.
- View Vouchers Screen: To act as an inventory ledger for a single item, queries the vouchers table and calculates totals to display transactions.
- View Processes Screen: To view the history of production runs, queries the recipes table and groups ingredients by process name and date to display.
- View Outputs Screen: To show a complete history for a finished product, runs two separate queries and merges the results from both to create a chronological ledger.
- Alter Voucher Screen: To update or delete a voucher entry, loads entry data from a popup, and updates or deletes the selected voucher record from the database.
- Alter Process Screen: To update or delete a production process, adds the ingredients back to inventory before updating or deleting a process to prevents inventory data from becoming corrupt.
- Alter Output Screen: To update or delete a finalized output record, loads an output record, updates its values, and deletes the entry.
- Main App Class: The main class that runs the entire application, initializes everything, handles global key presses, and shows an exit confirmation popup.

## Style Guidelines:

- Primary color: Light green (#90EE90) to evoke a sense of growth, efficiency, and freshness, reflecting inventory tracking.
- Background color: Very light green (#F0FFF0), a desaturated shade of the primary to give a clean and calm backdrop.
- Accent color: Soft blue (#ADD8E6), an analogous hue, offering a sense of reliability and trust for the financial aspects.
- Font pairing: 'Inter' (sans-serif) for both headlines and body text, chosen for its modern, objective, and neutral look, and its suitability for various text lengths.
- Simple, clean icons that represent inventory items, vouchers, sales, and processes. Use a consistent style, and keep the color palette aligned with the primary and accent colors.
- Clear, well-organized layout with distinct sections for data entry, display, and actions. Prioritize essential information and ensure ease of navigation across different functions.
- Subtle transitions and animations to provide feedback during actions, such as saving, updating, or deleting data. These should enhance user experience without being distracting.