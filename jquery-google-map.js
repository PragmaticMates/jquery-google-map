(function ($) {
	var settings;
	var element;
	var map;
	var markers = new Array();
	var markerCluster;
	var clustersOnMap = new Array();
	var clusterListener;

	var methods = {
		init: function (options) {
			element = $(this);

			var defaults = $.extend({
				center: {
					latitude: 40.761077,
					longitude: -73.983307
				},
				zoom: 14,
				markers: [],
				enableGeolocation: false,
				infowindow: {
					borderBottomSpacing: 6,
					height: 145,
					width: 260
				},
				marker: {
					height: 32,
					width: 32
				},
				cluster: {
					height: 32,
					width: 32,
					gridSize: 40
				}
			});

			settings = $.extend({}, defaults, options);

			loadMap();
			// google.maps.event.addDomListener(window, 'load', loadMap);

			if (options.callback) {
				options.callback();
			}

			return $(this);
		},

		removeMarkers: function () {
			for (i = 0; i < markers.length; i++) {
				markers[i].infobox.close();
				markers[i].marker.close();
				markers[i].setMap(null);
			}

			markerCluster.clearMarkers();

			$.each(clustersOnMap, function (index, cluster) {
				cluster.cluster.close();
			});

			clusterListener.remove();
		},

		addMarkers: function (options) {
			markers = new Array();
			settings.locations = options.locations;
			settings.contents = options.contents;
			settings.types = options.types;

			renderElements();
		}
	}

	$.fn.google_map = function (method) {
		// Method calling logic
		if (methods[method]) {
			return methods[ method ].apply(this, Array.prototype.slice.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return methods.init.apply(this, arguments);
		} else {
			$.error('Method ' + method + ' does not exist on Aviators Map');
		}
	};

	function loadMap() {
		var mapOptions = {
			zoom              : settings.zoom,
			mapTypeId         : google.maps.MapTypeId.ROADMAP,
			scrollwheel       : false,
			draggable         : true,
			mapTypeControl    : false,
			panControl        : false,
			zoomControl       : true,
			zoomControlOptions: {
				style   : google.maps.ZoomControlStyle.SMALL,
				position: google.maps.ControlPosition.LEFT_BOTTOM
			}
		};

		if (settings.enableGeolocation) {
			if (navigator.geolocation) {
				browserSupportFlag = true;
				navigator.geolocation.getCurrentPosition(function (position) {
					initialLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
					map.setCenter(initialLocation);
				}, function () {
					mapOptions.center = new google.maps.LatLng(settings.center.latitude, settings.center.longitude);
				});
			} else {
				browserSupportFlag = false;
				mapOptions.center = new google.maps.LatLng(settings.center.latitude, settings.center.longitude);
			}
		} else {
			mapOptions.center = new google.maps.LatLng(settings.center.latitude, settings.center.longitude);
		}

		map = new google.maps.Map($(element)[0], mapOptions);

		var dragFlag = false;
		var start = 0, end = 0;

		function thisTouchStart(e) {
			dragFlag = true;
			start = e.touches[0].pageY;
		}

		function thisTouchEnd() {
			dragFlag = false;
		}

		function thisTouchMove(e) {
			if (!dragFlag) {
				return
			}

			end = e.touches[0].pageY;
			window.scrollBy(0, (start - end));
		}

		var el = element[0];

		if (el.addEventListener) {
			el.addEventListener('touchstart', thisTouchStart, true);
			el.addEventListener('touchend', thisTouchEnd, true);
			el.addEventListener('touchmove', thisTouchMove, true);
		} else if (el.attachEvent){
			el.attachEvent('touchstart', thisTouchStart);
			el.attachEvent('touchend', thisTouchEnd);
			el.attachEvent('touchmove', thisTouchMove);
		}

		google.maps.event.addListener(map, 'zoom_changed', function () {
			$.each(markers, function (index, marker) {
				marker.infobox.close();
				marker.infobox.isOpen = false;
			});
		});

		renderElements();

		$('.infobox .close').live('click', function () {
			$.each(markers, function (index, marker) {
				marker.infobox.close();
				marker.infobox.isOpen = false;
			});
		});
	}

	function isClusterOnMap(clustersOnMap, cluster) {
		if (cluster === undefined) {
			return false;
		}

		if (clustersOnMap.length == 0) {
			return false;
		}

		var val = false;

		$.each(clustersOnMap, function (index, cluster_on_map) {
			if (cluster_on_map.getCenter() == cluster.getCenter()) {
				val = cluster_on_map;
			}
		});

		return val;
	}

	function addClusterOnMap(cluster) {
		// Hide all cluster's markers
		$.each(cluster.getMarkers(), (function () {
			if (this.marker.isHidden == false) {
				this.marker.isHidden = true;
				this.marker.close();
			}
		}));

		var newCluster = new InfoBox({
			markers               : cluster.getMarkers(),
			draggable             : true,
			content               : '<div class="clusterer"><div class="clusterer-inner">' + cluster.getMarkers().length + '</div></div>',
			disableAutoPan        : true,
			pixelOffset           : new google.maps.Size(-21, -21),
			position              : cluster.getCenter(),
			closeBoxURL           : "",
			isHidden              : false,
			enableEventPropagation: true,
			pane                  : "mapPane"
		});

		cluster.cluster = newCluster;

		cluster.markers = cluster.getMarkers();
		cluster.cluster.open(map, cluster.marker);
		clustersOnMap.push(cluster);
	}

	function renderElements() {
		$.each(settings.markers, function (index, markerObject) {
			var marker = new google.maps.Marker({
				position: new google.maps.LatLng(markerObject.latitude, markerObject.longitude),
				map: map,
				icon: {
					size: new google.maps.Size(settings.marker.width, settings.marker.height),
					url: settings.transparentMarkerImage
				}
			});


			// Create infobox for infowindow
			if (markerObject.content) {
				marker.infobox = new InfoBox({
					content: markerObject.content,
					disableAutoPan: false,
					maxWidth: 0,
					pixelOffset: new google.maps.Size(-settings.infowindow.width/2, -settings.infowindow.height - settings.marker.height - settings.infowindow.borderBottomSpacing),
					zIndex: null,
					closeBoxURL: "",
					infoBoxClearance: new google.maps.Size(1, 1),
					position: new google.maps.LatLng(markerObject.latitude, markerObject.longitude),
					isHidden: false,
					pane: "floatPane",
					enableEventPropagation: false
				});

				marker.infobox.isOpen = false;
			}

 			// Create infobox for marker
			marker.marker = new InfoBox({
				draggable: true,
				content: '<div class="marker"><div class="marker-inner"></div></div>',
				disableAutoPan: true,
				pixelOffset: new google.maps.Size(-settings.marker.width/2, -settings.marker.height),
				position: new google.maps.LatLng(markerObject.latitude, markerObject.longitude),
				closeBoxURL: "",
				isHidden: false,
				pane: "floatPane",
				enableEventPropagation: true
			});

			marker.marker.isHidden = false;
			marker.marker.open(map, marker);
			markers.push(marker);

			google.maps.event.addListener(marker, 'click', function (e) {
				var curMarker = this;

				$.each(markers, function (index, marker) {
					// if marker is not the clicked marker, close the marker
					if (marker !== curMarker && marker.content) {
						marker.infobox.close();
						marker.infobox.isOpen = false;
					}
				});

				if (curMarker.infobox) {
					if (curMarker.infobox.isOpen === false) {
						curMarker.infobox.open(map, this);
						curMarker.infobox.isOpen = true;
					} else {
						curMarker.infobox.close();
						curMarker.infobox.isOpen = false;
					}
				}
			});
		});

		markerCluster = new MarkerClusterer(map, markers, {
            gridSize: settings.cluster.gridSize,
			styles: [
				{
					height: settings.cluster.height,
					url: settings.transparentClusterImage,
					width: settings.cluster.width,
				}
			]
		});

		clustersOnMap = new Array();

		clusterListener = google.maps.event.addListener(markerCluster, 'clusteringend', function (clusterer) {
			var availableClusters = clusterer.getClusters();			
			var activeClusters = new Array();

			$.each(availableClusters, function (index, cluster) {
				if (cluster.getMarkers().length > 1) {
					activeClusters.push(cluster);
				}
			});

			$.each(availableClusters, function (index, cluster) {
				if (cluster.getMarkers().length > 1) {
					var val = isClusterOnMap(clustersOnMap, cluster);

					if (val !== false) {
						val.cluster.setContent('<div class="clusterer"><div class="clusterer-inner">' + cluster.getMarkers().length + '</div></div>');
						val.markers = cluster.getMarkers();
						$.each(cluster.getMarkers(), (function (index, marker) {
							if (marker.marker.isHidden == false) {
								marker.marker.isHidden = true;
								marker.marker.close();
							}
						}));
					} else {
						addClusterOnMap(cluster);
					}
				} else {
					// Show all markers without the cluster
					$.each(cluster.getMarkers(), function (index, marker) {
						if (marker.marker.isHidden == true) {
							marker.marker.open(map, this);
							marker.marker.isHidden = false;
						}
					});

					// Remove old cluster
					$.each(clustersOnMap, function (index, cluster_on_map) {
						if (cluster !== undefined && cluster_on_map !== undefined) {
							if (cluster_on_map.getCenter() == cluster.getCenter()) {
								// Show all cluster's markers
								cluster_on_map.cluster.close();
								clustersOnMap.splice(index, 1);
							}
						}
					});
				}
			});

			var newClustersOnMap = new Array();

			$.each(clustersOnMap, function (index, clusterOnMap) {
				var remove = true;

				$.each(availableClusters, function (index2, availableCluster) {
					if (availableCluster.getCenter() == clusterOnMap.getCenter()) {
						remove = false;
					}
				});

				if (!remove) {
					newClustersOnMap.push(clusterOnMap);
				} else {
					clusterOnMap.cluster.close();
				}
			});

			clustersOnMap = newClustersOnMap;
		});
	}
})(jQuery);
