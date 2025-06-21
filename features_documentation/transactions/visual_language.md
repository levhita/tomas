We will use a full-page mode for showing transactions and admin it.

Tables:

- Sortable columns
- Filterable by categories or column/values
- Selectable for bulk actions
- Text aligns to the left
- Align heading to column data
- Avoid duplication
- Right-align numeric columns
- Sticky headers for more than 10 elements when the pagination asks for a quantity greater than that value quantity
- Contrast in the table header
- Allow pagination of columns
- Allow searchability of a record by the central concept
- Sebra stripes for large datasets
- When scrolling horizontally, fix the first column
- Add the ability to hide columns
- Inline editing is used to quickly change small attributes like date, name, and amount
- Add quick actions by row for editing, deleting, and hiding to not add too much noise to the table under a three-point vertical menu
- Set a table toolbar for main actions in table context: Create record, search for documents, filter records, etc
- The table configuration must be saved while navigating the table data so that if we go back and forward, we do not lose the state of the table
- The default action to reset the table filters must be added
- Buttons: We will add icon-text buttons for main actions on the table toolbar (Create, Search, Filter)

Dialogs
- We add dialogs for alerting the user of irreversible actions like deletion 
- We use dialogs for main actions like create a new record and actions in the same context of the table.
- The actions that will use dialogs are: Filtering, create a new record, delete a record, confirmations and alerts.

Drilldown
- To know more about a record, we deep dive into its details in its transaction/id space/page. Here, we give the ability to perform a more exhaustive review of the transactions and allow editing of the longest non-inline-editing-suitable properties of the table or transactions.
- Drilldowns happen when the record row is clicked
- Drilldown page must have navigation features to go back to the table and the previous state of view for the user


> Note: We must create reusable components for the elements described above to ensure continuity in all the application. eventually the existing elements in other areas of the app should get a refactor to accomplish this mission.