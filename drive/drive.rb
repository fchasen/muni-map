require "rubygems"
require "google_drive"
require "json"

# Logs in.
# You can also use OAuth. See document of
# GoogleDrive.login_with_oauth for details.
session = GoogleDrive.login("fchasen@gmail.com", "bigfoot!95")

# First worksheet

# demo - 0ArEZT8yC7p8udFl5VU1SLVQ4SWJDdjM1VUY3TnVPbmc
# real - 0AsYEEui8KC1ZdGt5TF9kaVpvVndvN21jbnVwUGltWWc

sheet = session.spreadsheet_by_key("0Asa9EVVf8o6OdDZ0YXNDd0YyVVZLby1EXzJVc21CaUE").worksheets[0]

key_row = 1
start_row = 2


events = []

# Dumps all cells.
for row in start_row..sheet.num_rows
    event = {}
    #puts sheet[row, 1]
    for col in 1..sheet.num_cols
        key = sheet[key_row, col]
	    	val = sheet[row, col]
        event[key] = val
	 	end
	
	events.push(event)
 	#puts event
 	
end

File.open("events.json", 'w') {|f| f.write(events.to_json) }


# Reloads the worksheet to get changes by other clients.
#ws.reload()
