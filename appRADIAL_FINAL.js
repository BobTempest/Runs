

const createDate = string => new Date(string);
const toSeconds = num => Math.floor(num / 1000);
const parseDate = string => d3.timeParse('%d-%m-%Y')(string);
const startDate = new Date('April 19, 2020 00:00:00');
const monthsNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const stringsCatalog = {
      distance: "Distance",
      duration: "Temps",
      speed: "Vitesse"}

const HEIGHT = 975
const WIDTH = 975
const MARGIN_TOP = 80
const MARGIN_LEFT = 60

let MASTERMETRIC = "duration"

function typeCheck(d) {
    const date = createDate(d.date);
    const seconds = toSeconds(d.time);
    const kmh = (d.length/seconds) * 3.6 ;

    return {
        date: date,
        seconds: seconds,
        duration: d.time,
        distance: d.length,
        speed: kmh,
        type: 'INITIAL'
    }
}

function sortingData(data)
{
    data.sort( ( a, b) => {
        return new Date(a.date) - new Date(b.date);
    });
    return data;
}

function sameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate();
  }

function addingEmptyDates(data)
{
    let curDate = startDate
    let count = 0;
    let datesToAdd = [];
    for ( i  = 0; i < 365; i ++)
    {
        let popo = data.filter(j => sameDay(j.date, curDate));
        if (popo.length > 0)
        {
            count ++;
        }   
        else
        {
            datesToAdd = [...datesToAdd,
            {
                date: new Date(curDate),
                seconds: 0,
                duration: 0,
                distance: 0,
                speed: 0,
                type: 'EMPTY'
            }]
        }
        
       curDate.setDate(curDate.getDate() + 1)
       
    }

    // console.log('found ok dates between start + 365  = ' + count)

    data = [ ...data, ...datesToAdd]
    console.log('data is now ' + data.length + ' long')
    console.log('datesToAdd is now   ' + datesToAdd.length + ' long')
    return data;
}

// Data preparation
function filterData(data) {
    // si durée > 18 min et < 60 && distance  < 2 km : set a 'NO DISTANCE RECORDED'
    let count = 0;
    let sumDistance = 0;
    let sumDuration = 0;

    for (i=0; i < data.length; i++)
    {
        if (data[i].duration > 1080000 && data[i].distance < 2000)
        {
            data[i].type = 'NO DISTANCE RECORDED'
        }
        else if (data[i].speed < 4 || data[i].speed > 10 )
        {
            data[i].type = 'IS NOT RUNNING'
        }
        else
        {
            data[i].type = 'RUNNING'
            count++;
            sumDistance = Number(sumDistance) + Number(data[i].distance)
            sumDuration = Number(sumDuration) + Number(data[i].duration)
        }
    }

    let averageDuration = sumDuration/count
    let averageDistance = sumDistance/count
    let averageSpeed = (averageDistance / (Math.floor(averageDuration / 1000))) * 3.6

    for (i = 0; i < data.length; i++)
    {
        if (data[i].type === 'NO DISTANCE RECORDED')
        {
            data[i].speed = averageSpeed
            data[i].distance = averageDistance
        }
    }
    
    return data.filter( d => {
        return ( d.type === 'EMPTY' 
                || d.type === 'NO DISTANCE RECORDED' 
                || (d.speed > 4 && d.speed < 10  )
        );
    });
}

// Drawing utilities.

function formatXtick(d){
    d = d.replace(/,/g, ""); // remove all the ','  
    d = +d
    if (MASTERMETRIC === "duration")
        return formatDuration(d)
    else if (MASTERMETRIC === "speed")
        return d.toFixed(2) + ' km/h' 
    else if (MASTERMETRIC === "distance")
        return formatDistance(d)
    else {
        console.log("UNknown MASTERMETRIC")
    }
}

// input in milliseconds, output in xh xxm xxs
function formatDuration(d) {
    let secs = Math.floor(+d / 1000);
    let mins = Math.floor(secs / 60);
    let hours = Math.floor(mins / 60);

    if  (mins > 1 ) 
    {
        let secLeft = secs - (mins * 60);

        secLeft = secLeft < 10 ? '0' +  secLeft : secLeft;

        let minutesLeft = mins - (60 * hours)

        minutesLeft = minutesLeft < 10 ? '0' +  minutesLeft : minutesLeft;

        if (hours > 0)
        {
            return hours + "h " + minutesLeft + "m " + secLeft + "s"
        }
        return mins + "m " + secLeft + "s"
    }
    else
    {
        return secs + "s"
    }   
  }

  function formatDate(d) {
        return d.getDate() + "-" + (d.getMonth() + 1) + "-" + d.getFullYear()
  }

  function formatNiceDate(d) {
    return d.getDate() + " " + monthsNames[d.getMonth()] + " " + d.getFullYear()
    }

  function formatDistance(d) {
      let meters = Math.round(d % 1000) == 0 ? '' : Math.round(d % 1000)
      return Math.floor(d / 1000) + ' km ' + meters
  }

  // Tooltip handler
function onMouseOver()
{
    // get data : 
    const barData = d3.select(this).data()[0];

    const bodyData = [
        ['Temps', formatDuration(barData.duration)],
        ['Distance', barData.type === "NO DISTANCE RECORDED" ? 'non enregistrée' : formatDistance(barData.distance) ],
        ['Vitesse', barData.type === "NO DISTANCE RECORDED" ? 'non calculée' : barData.speed.toFixed(2) + ' km/h' ]
    ];

    if (barData.type === "NO DISTANCE RECORDED")
    {
        bodyData.push(['NB', "La distance et la vitesse représentées sont issues du calcul d'une moyenne sur l'année."])
    }

    const tip = d3.select('.tooltip');

    var xy = d3.pointer(event)

    tip.style('left', `${xy[0] + (WIDTH - MARGIN_LEFT ) / 2}px`)
        .style('top', `${xy[1] + (HEIGHT - MARGIN_TOP + 30) / 2}px`)
        .transition()
        .style('opacity', 0.9)

    tip.select('h3').html(`${formatNiceDate(barData.date)}`);

    d3.select('.tip-body')  
        .selectAll('p')     //non -existing when called
        .data(bodyData)     //virtually assigning the data for each item of body=Data
        .join('p')          // and ... joining
        .attr('class','tip-info')
        .html(d => `${d[0]}: ${d[1]}`) // for each sdata row of bodyData
}

function onMouseMove()
{
    var xy = d3.pointer(event)
    d3.select('.tooltip')
        .style('left', `${xy[0] + (WIDTH - MARGIN_LEFT ) / 2}px`) 
        .style('top', `${xy[1] + (HEIGHT - MARGIN_TOP + 30) / 2}px`)
}

function onMouse0ut()
{
    d3.select('.tooltip')
        .transition()
        .style('opacity', 0)
}

// Main Function
function dataIsReady(runs) {
   //  duration || distance || speed

    let metric = 'duration'; 

    function onClick() {
        metric = this.dataset.name;
        MASTERMETRIC = this.dataset.name;

        /* FOR REFERENCE. In Runs, We don't update the data
        const updatedData = moviesFiltered
            .sort((a,b) => b[metric] - a[metric]) // this is array sorting man
            .filter((d,i) => i < 15);
        */

        update(barChartData);
    }

    function update(data)
    {
        //console.log("Update for " + MASTERMETRIC)
        // Update scales
        //xScale.domain([0, d3.max(data, d => d[metric])]);
        yScale = d3.scaleRadial()
            .domain([0, d3.max(barChartData, d => d[metric])])
            .range([innerRadius, outerRadius])

        //set up transition
        const dur = 1000;
        const t = d3.transition()
                    .duration(dur)

        // update bars
        container.selectAll('.bar')
            .data(barChartData)
            .join(
                enter =>  {
                    enter
                    .append('path')
                    .attr('class', 'bar')
                    .style('fill', 'dodgerblue')
                    .transition(t)
                    .delay((d,i) => i*3)
                    .attr('d', arc)
                    .style('fill', d => d.type === "NO DISTANCE RECORDED" ? 'mediumturquoise' : 'dodgerblue')
                },

                update => { 
                    update
                    .transition(t)
                    .delay((d,i) => i*5)
                    .attr('d', arc)
                },

                exit => exit
                    .transition()
                    .duration(dur/2)
                    .style('fill-opacity', 0)
                    .remove()
            )

        // draw updated Axis

        svg.selectAll('.yCircle').remove();
        svg.selectAll('.yTick').remove();
        svg.selectAll('.yTitle').remove();
        yAxisDraw.call(yAxis);

        // Update Y Axis title
        d3.selectAll('.yTitle').each(function(d){
                var txt = this.textContent;
                this.textContent = stringsCatalog[MASTERMETRIC]
            });

        // format y ticks text
        d3.selectAll('.yTick').each(function(d){
            var txt = this.textContent;
            this.textContent = formatXtick(txt)
        });

        //yAxisDraw.selectAll('text').attr('dx', '-0.6em');

        // update header
        headline.text("Une année de Running [ " + stringsCatalog[MASTERMETRIC] + " ]");

        // update listeners
        d3.selectAll('.bar')
            .on('mouseover', onMouseOver)
            .on('mousemove', onMouseMove)
            .on('mouseout', onMouse0ut);
    }

    // Data Prep
    runs = filterData(runs)
    // if no record for this day, adds an empty record
    runs = addingEmptyDates(runs);
    const barChartData = sortingData(runs);
    console.log(barChartData);

    // Draw base
    const margin = { top: MARGIN_TOP, right: 40, bottom: 40, left:MARGIN_LEFT };
    const width = WIDTH - margin.left - margin.right;
    const height = HEIGHT - margin.top - margin.bottom;
    const innerRadius = 200
    const outerRadius = Math.min(width, height) / 2

    let metricsName = stringsCatalog[MASTERMETRIC]

    const svg = d3.select('.bar-chart-container')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)

    const xScale = d3.scaleBand()
        .domain(barChartData.map(d => d.date))
        .range([0, 2 * Math.PI])
        .align(0)


    // This scale maintains area proportionality of radial bars
    var yScale = d3.scaleRadial()
        .domain([0, d3.max(barChartData, d => d.duration)])
        .range([innerRadius, outerRadius])

        
    // arc // an arc is a bar deformed. thinner at the bottom, larger at the top. It's a camembert.
    
    arc = d3.arc()
        .innerRadius(innerRadius) // bottom of my arc
        .outerRadius(d => yScale(d[MASTERMETRIC])) // top of my arc
        .startAngle(d => xScale(d.date))
        .endAngle(d => xScale(d.date) + xScale.bandwidth())
        .padAngle(0.01)
        .padRadius(innerRadius)
      
 
    const container = svg.append('g')
        .attr('class', 'container')
        .attr('transform', `translate(${ width/2 },${ height/2 })`)
        .style('font-size', 10)
        .style('font-family', 'sans-serif')

    // scales // for reference
    const xExtent = d3.extent(barChartData, d => d.duration); // returns the lower and the higher value
    xExtent[0] = 0


    // draw Axes

    let startingDate = new Date(barChartData[0].date)
    let datesForXAxis = [barChartData[0].date]
    // collect the starting date and 12 dates separated by one month
    for (let i = 0 ; i < 11; i ++)
    {
        datesForXAxis.push(startingDate.setMonth(startingDate.getMonth()+1))
    }

    // text formating
    let datesForXAxisFormated = []
    for (let i = 0 ; i < datesForXAxis.length; i ++)
    {
        datesForXAxisFormated.push(formatNiceDate(new Date(datesForXAxis[i])))
    }

    // permutation to start at +3
    for (let i = 0 ; i < 3; i ++)
    {
        datesForXAxisFormated.push(datesForXAxisFormated.splice(0, 1)[0])
    }  

    xAxis = g => g
        .attr('text-anchor', 'middle')
        .call(g => g.selectAll('g')
            .data( datesForXAxisFormated )
            .join('g')
            .attr('transform', (d,i,arr) => `
                rotate(${ ( i * 360/arr.length ) }) 
                translate(${innerRadius},0)
            `)
            .call(g => g.append('line')
                .attr('x1', -5)
                .attr('x2', outerRadius - innerRadius + 10)
                .style('stroke', '#000'))
            .call(g => g.append('text')
                .attr('transform', (d,i,arr) => (((i )* 360/arr.length) % 360 > 180
                    ? "rotate(90)translate(0,16)"
                    : "rotate(-90)translate(0,-9)"))
                .style('font-family', 'sans-serif')
                .style('font-size', 10)
                .text(d => d)))

    yAxis = g => g
        .attr('text-anchor', 'middle')
        .call(g => g.append('text') // Texte de la legende
            .attr('text-anchor', 'end')
            .attr('class', 'yTitle')
            .attr('x', '-0.5em')
            .attr('y', d => -yScale(yScale.ticks(5).pop()) + 2)
            .attr('dy', '-1em')
            .style('fill', '#1a1a1a')
            .text(metricsName)
        )
        .call(g => g.selectAll('g')
        .data(yScale.ticks(8))
        .join('g')
            .attr('fill', 'none')
            .call(g => g.append('circle')
                .style('stroke', '#aaa')
                .style('stroke-opacity', 0.5)
                .attr('r', yScale))
                .attr('class', 'yCircle')
            .call(g => g.append('text')
                .attr('y', d => -yScale(d))
                .attr('dy', '0.35em')
                .style('stroke', '#fff')
                .style('stroke-width', 5)
                .style("fill",'#1a1a1a')
                .text(yScale.tickFormat(1))
                .attr('class', 'yTick')
            .clone(true)
                .style('stroke', 'none')
                ))

    container.append('g')
        .call(xAxis)
    
    let yAxisDraw = 
        container
            .append('g')
            .attr('class', 'y axis')

    // format y ticks text
    d3.selectAll('.yTick').each(function(d){
        var txt = this.textContent;
        this.textContent = formatXtick(txt)
    });

    // update listeners
    d3.selectAll('.bar')
    .on('mouseover', onMouseOver)
    .on('mousemove', onMouseMove)
    .on('mouseout', onMouse0ut);

    // draw Header
    const header = svg
    .append('g')
    .attr('class', 'bar-header')
    .attr('transform', `translate(327, 320)`)
    .append('text');

    const headline = header.append('tspan').text('Une année de Running [ ' + stringsCatalog[metric] + ' ]'); // as a variable to make it updatable



    header.append('tspan')
            .text('du 19 avril 2020 au 19 avril 2021')
            .attr('x', 0)
            .attr('dy', '1.5em')
            .attr('font-size', '0.8em')

    // initial bar render
    update(barChartData);

    // position the buttons
    const buttonz = d3.select('.controls');
    buttonz.style('left', '335px')
            .style('top', '360px')
            .transition()

    // Listen to button clicks events
    d3.selectAll('button').on('click', onClick);
}

d3.csv('gpxData/output02.csv', typeCheck).then(res => {
    dataIsReady(res);
});

// output.csv has data from march 2020 to nov 20 + a few bike rides in 2019
// output02.csv has data from march 2020 to march 21 + a few bike rides in 2019