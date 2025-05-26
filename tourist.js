// Инициализация на картата
const map = L.map('map').setView([42.7339, 25.4858], 7);

// Добавяне на топографска базова карта
L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
}).addTo(map);

// Създаване на слой за обектите
const featuresLayer = L.layerGroup().addTo(map);
let currentFeature = null;
let tempLine = null;
let linePoints = [];

// Цветове за различните типове обекти
const featureStyles = {
  landmark: {
    color: '#e74c3c',
    radius: 6
  },
  route: {
    color: '#3498db',
    weight: 3
  }
};

// Зареждане на демо данни
loadSampleData();

// Добавяне на контроли
document.getElementById('add-point-btn').addEventListener('click', startAddingPoint);
document.getElementById('add-line-btn').addEventListener('click', startAddingLine);
document.getElementById('clear-all').addEventListener('click', clearAllFeatures);
document.getElementById('filter-type').addEventListener('change', filterFeatures);

// Обработка на модалния прозорец
document.querySelector('.close').addEventListener('click', closeModal);
document.getElementById('feature-form-data').addEventListener('submit', saveFeature);

// Функция за започване на добавяне на точка
function startAddingPoint() {
  map.off('click');
  map.on('click', function(e) {
    currentFeature = {
      type: 'landmark',
      geometry: {
        type: 'point',
        coordinates: [e.latlng.lat, e.latlng.lng]
      }
    };
    openModal();
  });
}

// Функция за започване на добавяне на линия
function startAddingLine() {
  linePoints = [];
  tempLine = null;
  
  map.off('click');
  map.on('click', function(e) {
    linePoints.push([e.latlng.lat, e.latlng.lng]);
    
    if (linePoints.length === 1) {
      tempLine = L.polyline([linePoints[0], linePoints[0]], {
        color: featureStyles.route.color,
        dashArray: '5, 5'
      }).addTo(map);
    } else {
      tempLine.setLatLngs(linePoints);
    }
    
    // При двойно кликване завършваме линията
    map.doubleClickZoom.disable();
    map.on('dblclick', function() {
      if (linePoints.length > 1) {
        currentFeature = {
          type: 'route',
          geometry: {
            type: 'line',
            coordinates: linePoints
          }
        };
        map.removeLayer(tempLine);
        openModal();
      }
    });
  });
}

// Функция за отваряне на модалния прозорец
function openModal() {
  document.getElementById('feature-form').style.display = 'block';
}

// Функция за затваряне на модалния прозорец
function closeModal() {
  document.getElementById('feature-form').style.display = 'none';
  document.getElementById('feature-form-data').reset();
  currentFeature = null;
  linePoints = [];
  tempLine = null;
  map.off('click');
  map.off('dblclick');
  map.doubleClickZoom.enable();
}

// Функция за запазване на обект
function saveFeature(e) {
  e.preventDefault();
  
  const featureType = document.getElementById('feature-type').value;
  const featureName = document.getElementById('feature-name').value;
  const featureDescription = document.getElementById('feature-description').value;
  
  currentFeature.name = featureName;
  currentFeature.description = featureDescription;
  currentFeature.type = featureType;
  
  addFeatureToMap(currentFeature);
  updateAttributeTable();
  closeModal();
}

// Функция за добавяне на обект към картата
function addFeatureToMap(feature) {
  let layer;
  
  if (feature.geometry.type === 'point') {
    layer = L.circleMarker(
      [feature.geometry.coordinates[0], feature.geometry.coordinates[1]], 
      {
        radius: featureStyles.landmark.radius,
        fillColor: featureStyles.landmark.color,
        color: '#fff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
      }
    );
  } else if (feature.geometry.type === 'line') {
    layer = L.polyline(
      feature.geometry.coordinates.map(coord => [coord[0], coord[1]]),
      {
        color: featureStyles.route.color,
        weight: featureStyles.route.weight
      }
    );
  }
  
  layer.featureData = feature;
  layer.addTo(featuresLayer);
  
  // Добавяне на popup
  layer.bindPopup(`
    <b>${feature.name}</b><br>
    <i>${feature.type === 'landmark' ? 'Забележителност' : 'Маршрут'}</i><br>
    ${feature.description || ''}
  `);
  
  // При клик върху обект го избираме в таблицата
  layer.on('click', function() {
    highlightFeatureInTable(layer);
  });
}

// Функция за зареждане на демо данни
function loadSampleData() {
  const sampleData = [
    {
      type: 'landmark',
      name: 'Рилски манастир',
      description: 'Най-големият манастир в България, основан през 10 век.',
      geometry: {
        type: 'point',
        coordinates: [42.1339, 23.3409]
      }
    },
    {
      type: 'landmark',
      name: 'Алеко',
      description: 'Планински курорт във Витоша.',
      geometry: {
        type: 'point',
        coordinates: [42.5822, 23.2856]
      }
    },
    {
      type: 'route',
      name: 'Маршрут Витоша',
      description: 'Популярен планински маршрут.',
      geometry: {
        type: 'line',
        coordinates: [
          [42.5822, 23.2856],
          [42.5710, 23.2800],
          [42.5633, 23.2819],
        ]
      }
    }
  ];
  
  sampleData.forEach(feature => {
    addFeatureToMap(feature);
  });
  
  updateAttributeTable();
}

// Функция за актуализиране на атрибутната таблица
function updateAttributeTable() {
  const table = document.getElementById('attribute-table');
  table.innerHTML = '';
  
  const features = [];
  featuresLayer.eachLayer(layer => {
    features.push(layer.featureData);
  });
  
  if (features.length === 0) {
    table.innerHTML = '<p>Няма намерени обекти</p>';
    return;
  }
  
  const tableEl = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  
  // Заглавни редове
  const headerRow = document.createElement('tr');
  ['Име', 'Тип', 'Описание', 'Действия'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  tableEl.appendChild(thead);
  
  // Данни
  features.forEach((feature, index) => {
    const row = document.createElement('tr');
    row.dataset.featureId = index;
    
    [feature.name, feature.type === 'landmark' ? 'Забележителност' : 'Маршрут', feature.description || '-'].forEach(text => {
      const td = document.createElement('td');
      td.textContent = text;
      row.appendChild(td);
    });
    
    // Бутони за действия
    const actionsTd = document.createElement('td');
    
    const zoomBtn = document.createElement('button');
    zoomBtn.textContent = 'Зуум';
    zoomBtn.className = 'action-btn';
    zoomBtn.addEventListener('click', () => zoomToFeature(feature));
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Изтрий';
    deleteBtn.className = 'action-btn';
    deleteBtn.addEventListener('click', () => deleteFeature(index));
    
    actionsTd.appendChild(zoomBtn);
    actionsTd.appendChild(deleteBtn);
    row.appendChild(actionsTd);
    
    tbody.appendChild(row);
  });
  
  tableEl.appendChild(tbody);
  table.appendChild(tableEl);
}

// Функция за зуум към обект
function zoomToFeature(feature) {
  if (feature.geometry.type === 'point') {
    map.setView([feature.geometry.coordinates[0], feature.geometry.coordinates[1]], 14);
  } else if (feature.geometry.type === 'line') {
    const line = feature.geometry.coordinates.map(coord => [coord[0], coord[1]]);
    map.fitBounds(line);
  }
}

// Функция за изтриване на обект
function deleteFeature(index) {
  if (confirm('Сигурни ли сте, че искате да изтриете този обект?')) {
    let i = 0;
    featuresLayer.eachLayer(layer => {
      if (i === index) {
        featuresLayer.removeLayer(layer);
      }
      i++;
    });
    updateAttributeTable();
  }
}

// Функция за филтриране на обекти
function filterFeatures(filterType) {
  featuresLayer.eachLayer(layer => {
    if (filterType === 'all' || layer.featureData.type === filterType) {
      layer.setStyle({opacity: 1, fillOpacity: 0.8});
    } else {
      layer.setStyle({opacity: 0.3, fillOpacity: 0.2});
    }
  });
}

// Функция за изчистване на всички обекти
function clearAllFeatures() {
  if (confirm('Сигурни ли сте, че искате да изтриете всички обекти?')) {
    featuresLayer.clearLayers();
    updateAttributeTable();
  }
}

// Функция за подчертаване на обект в таблицата
function highlightFeatureInTable(layer) {
  const rows = document.querySelectorAll('#attribute-table tr');
  let index = 0;
  
  featuresLayer.eachLayer(featureLayer => {
    if (featureLayer === layer) {
      rows.forEach(row => row.style.backgroundColor = '');
      if (rows[index + 1]) { // index + 1 защото първия ред е заглавния
        rows[index + 1].style.backgroundColor = '#ffeb3b';
      }
    }
    index++;
  });
}