function processChat(event) {
	var file = event.target.files[0];
	var reader = new FileReader();

	reader.onload = (function() {
		chatText = reader.result;
		var stats = {};

		//turn the chat text into an array of objects
		var chatLines = chatText.split('\n');
		var chat = [];
		var message_count = 0;
		stats.senders = [];
		chatLines.forEach(function (line, i) {
			if (line.slice(2, 3) === '/') {
				var year = parseInt(line.slice(6, 10)),
						month = parseInt(line.slice(3, 5)) - 1,
						day = parseInt(line.slice(0, 2)),
						date = new Date(year, month, day);
				var hour = line.slice(13, 17);
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
			}
		});

		//calculate the total number of messages
		stats.message_count = message_count;

		//calculate the average number of messages per day
		var oneDay = 24 * 60 * 60 * 1000,
				date_span = Math.round(Math.abs((chat[chat.length - 1].date.getTime() - chat[0].date.getTime()) / (oneDay)));
		stats.avg_per_day = message_count / date_span;

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