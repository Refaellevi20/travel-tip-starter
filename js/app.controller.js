import { utilService } from './services/util.service.js'
import { locService } from './services/loc.service.js'
import { mapService } from './services/map.service.js'

window.onload = onInit
// window.renderRainbowCanvas =renderRainbowCanvas
window.gUserPos = null
window.selectedColor = ''

// To make things easier in this project structure 
// functions that are called from DOM are defined on a global app object
window.app = {
    onRemoveLoc,
    onUpdateLoc,
    onSelectLoc,
    onPanToUserPos,
    onSearchAddress,
    onCopyLoc,
    onShareLoc,
    onSetSortBy,
    onSubmitLocation,
    handleCancel,
    onSetFilterBy,
    applyThemeColor,
    showChangeThemeModal,
    hideChangeThemeModal,
    closeModal
    // renderRainbowCanvas
}


function onInit() {
    loadAndRenderLocs()
    renderRainbowCanvas()
    mapService.initMap()
        .then(() => {
            // onPanToTokyo()
            mapService.addClickListener(onAddLoc)
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot init map')
        })
}

function renderLocs(locs) {
    const selectedLocId = getLocIdFromQueryParams()

    if (gUserPos) {
        locs = locs.map(loc => {
            const locPos = { lat: loc.geo.lat, lng: loc.geo.lng }
            loc.distance = utilService.getDistance(gUserPos, locPos)
            return loc
        })
    }

    var strHTML = locs.map(loc => {
        const className = (loc.id === selectedLocId) ? 'active' : ''
        return `
        
        <li class="loc ${className}" data-id="${loc.id}">
            <h4>  
                <span>${loc.name}</span>
                <span title="${loc.rate} stars">${'★'.repeat(loc.rate)}</span>
            </h4>
            <p class="muted">
                Created: ${utilService.elapsedTime(loc.createdAt)}
                ${(loc.createdAt !== loc.updatedAt) ? ` | Updated: ${utilService.elapsedTime(loc.updatedAt)}` : ''}           
                ${loc.distance ? ` | Distance: ${loc.distance.toFixed(3)} km` : ''}
            </p>
            <div class="loc-btns">     
                <button title="Delete" onclick="app.onRemoveLoc('${loc.id}')">🗑️</button>
                <button title="Edit" onclick="app.onUpdateLoc('${loc.id}')">✏️</button>
                <button title="Select" onclick="app.onSelectLoc('${loc.id}')">🗺️</button>
            </div>     
        </li>`}).join('')

    const elLocList = document.querySelector('.loc-list')
    elLocList.innerHTML = strHTML || 'No locs to show'

    renderLocStats()

    if (selectedLocId) {
        const selectedLoc = locs.find(loc => loc.id === selectedLocId)
        displayLoc(selectedLoc)

        const locDistanceEl = document.querySelector('.loc-distance')
        locDistanceEl.innerText = `Distance: ${selectedLoc.distance ? selectedLoc.distance.toFixed(2) + ' km' : 'km'}`
    }
    document.querySelector('.debug').innerText = JSON.stringify(locs, null, 2)
}


function onRemoveLoc(locId) {
    const userConfirmed = confirm('Are you sure you want to remove this location?')

    if (!userConfirmed) {
        console.log(`the location ${locId} was canceled.`)
        flashMsg(`the location canceled`)
        return
    }

    locService.remove(locId)
        .then(() => {
            flashMsg('Location removed')
            unDisplayLoc()
            loadAndRenderLocs()
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot remove location')
        })
}

function handleCancel() {
    const dialog = document.querySelector('.location-dialog')
    const overlays = document.querySelector('.overlays')

    if (dialog) {
        dialog.close()
        closeModal()
         overlays.style.display = 'none'
    }
}

function onSearchAddress(ev) {
    ev.preventDefault()
    const el = document.querySelector('[name=address]')
    mapService.lookupAddressGeo(el.value)
        .then(geo => {
            mapService.panTo(geo)
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot lookup address')
        })
}

// function onAddLoc(geo) {
//     const locName = prompt('Loc name', geo.address || 'Just a place')
//     if (!locName) return

//     const getRandomLat = () => (Math.random() * (90.0 - (-90.0)) + (-90.0)).toFixed(7) 
//     const getRandomLng = () => (Math.random() * (180.0 - (-180.0)) + (-180.0)).toFixed(7)
//     const loc = {
//         name: locName,
//         rate: +prompt(`Rate (1-5)`, '3'),
//         geo: {
//             address: '',
//             lat: +getRandomLat(),
//             lng: +getRandomLng(),
//             zoom: 12
//         }
//     }
//     locService.save(loc)
//         .then((savedLoc) => {
//             flashMsg(`Added Location (id: ${savedLoc.id})`)
//             utilService.updateQueryParams({ locId: savedLoc.id })
//             loadAndRenderLocs()
//         })
//         .catch(err => {
//             console.error('OOPs:', err)
//             flashMsg('Cannot add location')
//         })
// }



function onAddLoc(loc) {
    const dialog = document.querySelector('.location-dialog')
    const overlay = document.querySelector('.overlay')
    const dialogTitle = document.querySelector('.dialog-title')
    console.log(loc);
    if (loc) {
        dialogTitle.innerText = 'Update Location'
        // console.log('updating Location:', loc)
        document.querySelector('.loc-name').value = loc.name || ''
        document.querySelector('.loc-rate').value = loc.rate || ''


        dialog.dataset.loc = JSON.stringify(loc)
    } else {
        dialogTitle.textContent = 'add Location'
        document.querySelector('.loc-name').value = ''
        document.querySelector('.loc-rate').value = ''

        delete dialog.dataset.loc
    }
    //* Open the dialog with the modal
    dialog.showModal()
    overlay.style.display = 'block'
}

function closeModal() {
    const dialog = document.querySelector('.location-dialog')
    const overlay = document.querySelector('.overlay')

    dialog.close() 
    overlay.style.display = 'none'
}

function onSubmitLocation(event,geo) {
    event.preventDefault()
    // 'Loc name', geo.address || 'Just a place'

    const dialog = document.querySelector('.location-dialog')
    const locName = document.querySelector('.loc-name').value
    const locRate = +document.querySelector('.loc-rate').value

    // if (isNaN(locRate) || locRate < 1 || locRate > 5)  return
    console.log(locName);



    //* i could do get randomIt but more code
    const getRandomLat = () => (Math.random() * (90.0 - (-90.0)) + (-90.0)).toFixed(7)
    const getRandomLng = () => (Math.random() * (180.0 - (-180.0)) + (-180.0)).toFixed(7)

    const loc = {
        name: locName,
        rate: locRate,
        geo: {
            address: '',
            lat: +getRandomLat(),
            lng: +getRandomLng(),
            zoom: 12
        }
    } 
    console.log(loc)
    

    locService.save(loc)
        .then(() => {
            flashMsg('Location added successfully')
            loadAndRenderLocs()
            utilService.updateQueryParams({ locId: savedLoc.id })

            //* Update the locations
            document.querySelector('.loc-name').innerText = locName
            document.querySelector('.loc-rate').innerText = `${'★'.repeat(locRate)} (${locRate} stars)`
            // flashMsg('Another loctions just add')

        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot add location')
        })
        closeModal()
    dialog.close()
    overlay.style.display = 'none'

    console.log(loc)
}

// function onUpdateLoc(locId) {
//     locService.getById(locId)
//         .then(geo => {
//             onAddLoc(geo)
//         })
//         .catch(err => {
//             console.error('OOPs:', err)
//             flashMsg('Cannot retrieve location for update')
//         })
// }

function loadAndRenderLocs() {
    locService.query()
        .then(renderLocs)
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot load locations')
        })
}

function onPanToUserPos() {
    mapService.getUserPosition()
        .then(latLng => {
            gUserPos = latLng
            console.log(gUserPos)

            mapService.panTo({ ...latLng, zoom: 15 })
            unDisplayLoc()
            loadAndRenderLocs()
            flashMsg(`You are at Latitude: ${latLng.lat} Longitude: ${latLng.lng}`)
        })
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot get your position')
        })
        .finally(() => console.log('user position'))
}


function onUpdateLoc(locId) {
    locService.getById(locId)
        .then(loc => {
            const rate = prompt('New rate?', loc.rate)
            if (rate !== loc.rate) {
                loc.rate = rate
                locService.save(loc)
                    .then(savedLoc => {
                        flashMsg(`Rate was set to: ${savedLoc.rate}`)
                        loadAndRenderLocs()
                        renderLocStats()
                    })
                    .catch(err => {
                        console.error('OOPs:', err)
                        flashMsg('Cannot update location')
                    })
            }
        })
}

function onSelectLoc(locId) {
    return locService.getById(locId)
        .then(displayLoc)
        .catch(err => {
            console.error('OOPs:', err)
            flashMsg('Cannot display this location')
        })
}

function displayLoc(loc) {
    document.querySelector('.loc.active')?.classList?.remove('active')
    document.querySelector(`.loc[data-id="${loc.id}"]`).classList.add('active')

    mapService.panTo(loc.geo)
    mapService.setMarker(loc)

    const el = document.querySelector('.selected-loc')
    el.querySelector('.loc-name').innerText = loc.name
    el.querySelector('.loc-address').innerText = loc.geo.address
    el.querySelector('.loc-rate').innerHTML = '★'.repeat(loc.rate)
    el.querySelector('[name=loc-copier]').value = window.location
    el.classList.add('show')

    utilService.updateQueryParams({ locId: loc.id })
}

function unDisplayLoc() {
    utilService.updateQueryParams({ locId: '' })
    document.querySelector('.selected-loc').classList.remove('show')
    mapService.setMarker(null)
}

function onCopyLoc() {
    const elCopy = document.querySelector('[name=loc-copier]')
    elCopy.select()
    elCopy.setSelectionRange(0, 99999) // For mobile devices
    navigator.clipboard.writeText(elCopy.value)
    flashMsg('Link copied, ready to paste')
}

function onShareLoc() {
    const url = document.querySelector('[name=loc-copier]').value

    // title and text not respected by any app (e.g. whatsapp)
    const data = {
        title: 'Cool location',
        text: 'Check out this location',
        url
    }
    navigator.share(data)
}

function flashMsg(msg) {
    const el = document.querySelector('.user-msg')
    el.innerText = msg
    el.style.display = 'bloke'

    el.classList.add('open')
    setTimeout(() => {
        el.style.display = 'none'
        el.classList.remove('open')
    }, 3000)
}


function getLocIdFromQueryParams() {
    const queryParams = new URLSearchParams(window.location.search)
    const locId = queryParams.get('locId')
    return locId
}

function onSetSortBy() {
    const prop = document.querySelector('.sort-by').value
    const isDesc = document.querySelector('.sort-desc').checked

    if (!prop) return

    const sortBy = {}
    sortBy[prop] = (isDesc) ? -1 : 1

    // Shorter Syntax:
    // const sortBy = {
    //     [prop] : (isDesc)? -1 : 1
    // }

    locService.setSortBy(sortBy)
    loadAndRenderLocs()
}



function onSetFilterBy({ txt, minRate }) {
    const filterBy = locService.setFilterBy({ txt, minRate: +minRate })
    utilService.updateQueryParams(filterBy)
    loadAndRenderLocs()
}

function renderLocStats() {
    locService.getLocCountByRateMap().then(stats => {
        console.log('rate stats:', stats)
        handleStats(stats, 'loc-stats-rate')
    })
    locService.getLocCountByUpdateMap().then(stats => {
        console.log('update stats:', stats)
        handleStats(stats, 'loc-stats-update')
    })
}



function handleStats(stats, selector) {
    // stats = { low: 37, medium: 11, high: 100, total: 148 }
    // stats = { low: 5, medium: 5, high: 5, baba: 55, mama: 30, total: 100 }
    // const rateLabels = cleanStats(stats)
    const labels = Object.keys(stats).filter(label => label !== 'total')
    const colors = utilService.getColors()

    var sumPercent = 0
    var colorsStr = `${colors[0]} ${0}%, `
    labels.forEach((label, idx) => {
        // if (idx === rateLabels.length - 1) return
        const count = stats[label]
        const percent = Math.round((count / stats.total) * 100, 2)
        sumPercent += percent
        colorsStr += `${colors[idx]} ${sumPercent}%, `
        if (idx < labels.length - 1) {
            colorsStr += `${colors[idx + 1]} ${sumPercent}%, `
        }
    })

    colorsStr += `${colors[labels.length - 1]} ${100}%`
    // Example:
    // colorsStr = `purple 0%, purple 33%, blue 33%, blue 67%, red 67%, red 100%`

    const elPie = document.querySelector(`.${selector} .pie`)
    const style = `background-image: conic-gradient(${colorsStr})`
    elPie.style = style

    const rateLegendHTML = labels.map((label, idx) => {
        return `
                <li>
                    <span class="pie-label" style="background-color:${colors[idx]}"></span>
                    ${label} (${stats[label]})
                </li>
            `
    }).join('')

    const elLegend = document.querySelector(`.${selector} .legend`)
    elLegend.innerHTML = rateLegendHTML


    
}

function cleanStats(stats) {
    const cleanedStats = Object.keys(stats).reduce((acc, label) => {
        if (label !== 'total' && stats[label]) {
            acc.push(label)
        }
        return acc
    }, [])
    return cleanedStats
}


function renderRainbowCanvas() {
    const canvas = document.getElementById('colorPickerCanvas')
    const ctx = canvas.getContext('2d')
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(canvas.width, canvas.height) / 2

    //* Create a radial gradient from center
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius)

    //* Add smooth rainbow colors (radial)
    gradient.addColorStop(0, 'red')
    gradient.addColorStop(0.15, 'darkorange')
    gradient.addColorStop(0.3, 'yellow')
    gradient.addColorStop(0.45, 'green')
    gradient.addColorStop(0.6, 'cyan')
    gradient.addColorStop(0.75, 'blue')
    gradient.addColorStop(0.9, 'indigo')
    gradient.addColorStop(1, 'violet')

    //* Fill canvas with radial rainbow gradient
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    //* Event listener to capture clicked color
    canvas.addEventListener('click', (event) => {
        const x = event.offsetX
        const y = event.offsetY
        const imageData = ctx.getImageData(x, y, 1, 1).data
        selectedColor = `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`
        console.log('Selected color:', selectedColor)
    })
}


function applyThemeColor() {
    document.body.style.backgroundColor = selectedColor
    
    hideChangeThemeModal()
}

function hideChangeThemeModal() {
    document.getElementById('changeThemeModal').classList.remove('active')
    document.querySelector('.overlay').classList.remove('active')

}

function showChangeThemeModal() {
    document.getElementById('changeThemeModal').classList.add('active')
    document.querySelector('.overlay').classList.add('active')
}