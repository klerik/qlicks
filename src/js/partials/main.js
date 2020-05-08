function myMap() {
	const mapCanvas = document.getElementById("map");
	const mapOptions = {
		center: {lat: 52.236175, lng: 5.177528},
		zoom: 10,
		disableDefaultUI: true
	};

	const marker = new google.maps.Marker({
		position: {lat: 52.236175, lng: 5.177528},
		map: mapOptions
	});

	const map = new google.maps.Map(mapCanvas, mapOptions, marker);
}
