# Filter Menu

A menu where items sit in horizontal strips and are filterable via a dashboard.

## Installation

* Add the [example JSON](example.json) to where the menu should reside; this is usually `course.json` for a root-level menu.
* Copy the menu folder into the src > menu directory and run an appropriate Grunt task.

## Usage

* The menu’s horizontal strips show up to four items at a time. On touch devices the strips are swipeable, otherwise there are buttons to scroll the content.
* Menu items may be linked to content objects or internal/external resources.
* A dashboard is included to toggle filtering of menu items. Items may be filtered by Boolean model attributes, e.g. `_isOptional`, and tags added by the course author.
* Items may be pinned for later reference. To display only pinned items, include a filter with an `_attribute` of `"_isPinned"` and a `_value` of `false`.

## Attributes

<table>
	<tr>
		<th colspan="4">Attribute</th>
		<th>Type</th>
		<th>Description</th>
		<th>Default</th>
	</tr>
	<tr>
		<td colspan="4"><code>_isProgressEnabled</code></td>
		<td>Boolean</td>
		<td>Displays an overall progress bar for all non-optional menu items</td>
		<td><code>false</code></td>
	</tr>
	<tr>
		<td rowspan="13"><code>_strips</code> (array)</td>
		<td colspan="3"><code>_id</code></td>
		<td>String</td>
		<td>Unique ID for the strip e.g. <code>"s-05"</code></td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="3"><code>_isProgressEnabled</code></td>
		<td>Boolean</td>
		<td>Displays a progress bar for the non-optional items in the strip</td>
		<td><code>false</code></td>
	</tr>
	<tr>
		<td colspan="3"><code>title</code></td>
		<td>String</td>
		<td>Strip title</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td rowspan="10"><code>_items</code> (array)</td>
		<td colspan="2"><code>_type</code></td>
		<td>String</td>
		<td>Specifies the type of item to be linked to, either <code>"contentObject"</code> or <code>"resource"</code></td>
		<td><code>"contentObject"</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>_id</code></td>
		<td>String</td>
		<td>Specifies the Adapt ID if the item is a content object or a unique ID if a resource e.g. <code>"r-05"</code></td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>_isOptional</code></td>
		<td>Boolean</td>
		<td>Specifies whether the item should be included in the progress bar (resources only)</td>
		<td><code>false</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>title</code></td>
		<td>String</td>
		<td>Item title used by screen readers (resources only)</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>displayTitle</code></td>
		<td>String</td>
		<td>Item title displayed visually (resources only)</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>body</code></td>
		<td>String</td>
		<td>Item body (resources only)</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>duration</code></td>
		<td>String</td>
		<td>Item duration (resources only)</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td><code>_graphic</code></td>
		<td><code>src</code></td>
		<td>String</td>
		<td>Item graphic (resources only)</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>_url</code></td>
		<td>String</td>
		<td>The URL which the item should link to (resources only)</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>_tags</code></td>
		<td>Array</td>
		<td>Tags to be associated with the item</td>
		<td><code>[]</code></td>
	</tr>
	<tr>
		<td rowspan="12"><code>_dashboard</code></td>
		<td colspan="3"><code>_isEnabled</code></td>
		<td>Boolean</td>
		<td>Enables the dashboard functionality accessed via a button on the navigation bar</td>
		<td><code>false</code></td>
	</tr>
	<tr>
		<td rowspan="7"><code>_filters</code></td>
		<td colspan="2"><code>_isEnabled</code></td>
		<td>Boolean</td>
		<td>Enables the section to filter by attribute</td>
		<td><code>false</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>title</code></td>
		<td>String</td>
		<td>Filters section title</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>body</code></td>
		<td>String</td>
		<td>Filters section body</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>instruction</code></td>
		<td>String</td>
		<td>Filters section instruction</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td rowspan="3"><code>_items</code> (array)</td>
		<td><code>_attribute</code></td>
		<td>String</td>
		<td>Attribute name to filter</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td><code>_value</code></td>
		<td>Boolean</td>
		<td>Attribute value to filter</td>
		<td><code>false</code></td>
	</tr>
	<tr>
		<td><code>title</code></td>
		<td>String</td>
		<td>Filter label</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td rowspan="4"><code>_tags</code></td>
		<td colspan="2"><code>_isEnabled</code></td>
		<td>Boolean</td>
		<td>Enables the section to filter by tag</td>
		<td><code>false</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>title</code></td>
		<td>String</td>
		<td>Tags section title</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>body</code></td>
		<td>String</td>
		<td>Tags section body</td>
		<td><code>""</code></td>
	</tr>
	<tr>
		<td colspan="2"><code>instruction</code></td>
		<td>String</td>
		<td>Tags section instruction</td>
		<td><code>""</code></td>
	</tr>
</table>
