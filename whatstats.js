function processChat(event) {
	var file = event.target.files[0];
	var reader = new FileReader();
	//minutes between two messages for them to be considered a single block of communication
	var TIMESPAN_PER_BLOCK = 5;
	
	var minuteDifference = function(date1, time1, date2, time2) {
		var hour1 = time1.slice(0, 2),
		    min1 = time1.slice(2, 4),
		    hour2 = time2.slice(0, 2),
		    min2 = time2.slice(2, 4),
			d1 = new Date(date1.getDate(), date1.getMonth(), date1.getFullYear(), parseInt(hour1), parseInt(min1)),
   		    d2 = new Date(date2.getDate(), date2.getMonth(), date2.getFullYear(), parseInt(hour2), parseInt(min2));
		//return the difference in minutes
		return (d2.getTime() - d1.getTime()) / 60000;
	};

	reader.onload = (function() {
		chatText = reader.result;
		var stats = {};

		//turn the chat text into an array of objects
		var chatLines = chatText.split('\n');
		var chat = [];
		var groupedChat = [];
		var message_count = 0;
		var message_block_count = 0;
		var chatBlock = {};
		stats.senders = [];
		chatLines.forEach(function (line, i) {
			if (line.slice(2, 3) === '/') {
				var year = parseInt(line.slice(6, 10)),
				    month = parseInt(line.slice(3, 5)) - 1,
				    day = parseInt(line.slice(0, 2)),
				    date = new Date(year, month, day);
				var hour = line.slice(12, 17);
				var sender = line.split(':')[1].split('-')[1].slice(1);
				chat[i] = {
					date: date,
					hour: hour,
					sender: sender
				};
				if (stats.senders.indexOf(sender) < 0) {
					stats.senders.push(sender);
				}
				message_count++;
				
				//operations regarding the grouped chat
				//if I find a new block
				if(chatBlock.sender === undefined || chatBlock.sender !== sender || 
				    minuteDifference(chatBlock.messages[chatBlock.messages.length - 1].date, chatBlock.messages[chatBlock.messages.length - 1].hour, date, hour) > TIMESPAN_PER_BLOCK) {
					//if it's not the very first block
					if(chatBlock.sender !== undefined) {
						//perform a shallow copy of the object
						groupedChat.push(JSON.parse(JSON.stringify(chatBlock)));
					}
					chatBlock.sender = sender;
					chatBlock.messages = [];
					message_block_count++;
				}
				chatBlock.messages.push({
					date: date,
					hour: hour
				});
			}
		});
		groupedChat.push(JSON.parse(JSON.stringify(chatBlock)));
		console.log(message_block_count);

		//calculate the total number of messages
		stats.message_count = message_count;
		
		//calculate the number of significant blocks of messages
		stats.message_blocks_count = message_block_count;

		//calculate the average number of messages per day
		var oneDay = 24 * 60 * 60 * 1000,
		    date_span = Math.round(Math.abs((chat[chat.length - 1].date.getTime() - chat[0].date.getTime()) / (oneDay))) + 1;
		stats.avg_per_day = message_count / date_span;
		
		//calculate the average number of messages per day
		stats.avg_blocks_per_day = message_block_count / date_span;

		//calculate the amount of messages per person
		stats.msg_per_person = [];
		stats.senders.forEach(function (sender) {
			var sender_count = chat.filter(function (msg) {
				return msg.sender === sender;
			}).length;
			stats.msg_per_person.push({
				sender: sender,
				count: sender_count,
				percent: sender_count / message_count * 100
			});
		});

		//calculate the amount of messages per day
		var last_day = '';
		stats.day_stats = [];
		chat.forEach(function (el) {
			if (el.date.valueOf() !== last_day.valueOf()) {
				last_day = el.date;
				stats.day_stats.push({
					day: el.date,
					count: 1
				});
			}
			else {
				stats.day_stats[stats.day_stats.length - 1].count++;
			}
		});
		showData(stats);
	});
	reader.readAsText(file);
};

function showData(stats) {
	
	$('#senders').html(stats.senders.join(', '));
	$('#total_messages').html(stats.message_count);
	$('#average_messages').html(stats.avg_per_day);
	$('#total_message_blocks').html(stats.message_blocks_count);
	$('#average_message_blocks').html(stats.avg_blocks_per_day);
	
	//fill in the data for the graph
	var chatData = [['Date', 'Count']];

	var dateIndex = stats.day_stats[0].day;

	stats.day_stats.forEach(function(el) {
		while(dateIndex.valueOf() < el.day.valueOf()) {
			chatData.push([dateIndex.getDate()+'/'+(dateIndex.getMonth()+1), 0]);
			dateIndex.setDate(dateIndex.getDate() + 1);
		}
		chatData.push([el.day.getDate() + '/' + (el.day.getMonth()+1), el.count]);
		dateIndex.setDate(dateIndex.getDate() + 1);
	});

	var linedata = google.visualization.arrayToDataTable(chatData);

	var lineoptions = {
		title: 'Message count',
		curveType: 'function',
		legend: { position: 'bottom' }
	};

	var linechart = new google.visualization.LineChart(document.getElementById('curve_chart'));

	linechart.draw(linedata, lineoptions);

	var sender_percent_data = [['Person', '% messages']];
	stats.msg_per_person.forEach(function(item){
		sender_percent_data.push([item.sender, item.percent]);
	});

	//draw the pie chart
	var piedata = google.visualization.arrayToDataTable(sender_percent_data);

	var pieoptions = {
		title: 'Messages per person'
	};

	var piechart = new google.visualization.PieChart(document.getElementById('piechart'));

	piechart.draw(piedata, pieoptions);

}