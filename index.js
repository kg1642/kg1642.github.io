
// function makeData(movies){
//     var
// }


//is not implemented at the moment. just returning false
function same_movie_list(result){
    return false
    var local_saved_movie_list = [];
    fetch('images/movies.json')
        .then(response => response.json())
        .then(json => local_saved_movie_list = json);
    console.log(local_saved_movie_list);
    console.log(result.results)
    if (local_saved_movie_list === result.results){
        return true;
    }
    else{
        return false;
    }
}

function getPopularMovies(){
    var movies = [];
    var url = 'https://api.themoviedb.org/3/movie/popular?api_key=b0cf07fad30a440f2c6f0070428f2dd6&language=en-US&page='
    for (i=1; i<4; i++){
        $.ajax({
            url: url + i,
            method: 'get',
            async : false,
            dataType: 'json',
            error: function (err){
                console.log(err)
            },
            success : function (result){
                if (same_movie_list(result)){
                    fetch('images/moviesWithURL.json')
                        .then(response => response.json())
                        .then(json => movies = json);
                }
                else {
                    for (j = 0; j < result.results.length; j++) {
                        review_url = null;
                        review_url = getReviews(result.results[j].title);
                        result.results[j]['review_url'] = review_url
                        if (review_url !=null){
                            result.results[j].overview = result.results[j].overview +"<br><b>Read NYT Review</b><br><a href = '"+review_url+"' target = '_blank'><img src ='images/NYTLogo.jpg' class = 'nyt-image'></a>";
                         }
                        movies.push(result.results[j])
                    }
                    //var a = document.createElement("a");
                    //var file = new Blob([movies], {type: 'text/plain'});
                    //a.href = URL.createObjectURL(file);
                    //a.download = 'images/moviesWithURL.json';
                    //a.click();
                }
            }
        })
    }
    //console.log(movies);
    //console.log('Review link', getReviews('Avengers: Infinity War'));
    //makeData(movies)
    return movies;
}

function getReviews(movie_name){
    var url = "https://api.nytimes.com/svc/movies/v2/reviews/search.json";
    url += '?' + $.param({
        'api-key': "56d9bfdec84b47eeae15a80df759b7e4",
        'query': movie_name
    });
    var review_url = '';
    $.ajax({
        url: url,
        method: 'GET',
        async: false,
    }).done(function(result) {
        if (result.num_results<1){
            review_url = null;
        }
        else {
            if (result.num_results<1){
                review_url = null;
            }
            else {
                review_url =  result.results[0].link.url
            }
        }
    }).fail(function(err) {
        review_url = null;
    });
    return review_url;
}

function getMaxMin(popular_movies){
    max_value = 0;
    min_value = 0;
    for (i=0; i <popular_movies.length; i++){
        if (popular_movies[i].popularity > max_value){
            max_value = popular_movies[i].popularity
        }
        if (popular_movies[i].popularity < min_value){
            min_value = popular_movies[i].popularity
        }
    }
    return [min_value, max_value]
}

function createDataListForD3(popular_movies, max_min_value){
    max_value = max_min_value [1];
    min_value = max_min_value [0];
    data_list_for_D3 = [];
    for (i=0; i <popular_movies.length; i++){
        var movie_dict = {
            name : popular_movies[i].title,
            value: popular_movies[i].popularity,
            icon : 'https://image.tmdb.org/t/p/original' + popular_movies[i].poster_path,
            desc: popular_movies[i].overview,
            cat : popular_movies[i].genre_ids[0]
        }
        data_list_for_D3.push(movie_dict)
    }
    return data_list_for_D3;
}

$(document).ready(function (){

    console.log('Document is ready!');
    popular_movies = getPopularMovies();
    console.log(popular_movies);
    max_min_value = getMaxMin(popular_movies);

    //creating that has to be sent to d3 for visualiazation. It is in json format.
    data = createDataListForD3(popular_movies, max_min_value);


    //creating a svg and initializing variables
    let svg = d3.select('svg');
    let width = document.body.clientWidth; // get width in pixels
    winHeight = window.innerHeight * 0.85;
    console.log(winHeight)
    //svg.setAttribute("height", winHeight);
    svg.attr('height', winHeight);
    //document.getElementsByTagName('svg').setAttribute.height  = winHeight;
    let height = +svg.attr('height');
    let centerX = width * 0.5;
    let centerY = height * 0.5;
    let strength = 0.05; //0.05
    let focusedNodeClicked;
    let focusedNode;
    let format = d3.format(',d');
    //let scaleColor = 'white';
    let scaleColor = d3.scaleOrdinal(d3.schemeCategory10);

    // use pack to calculate radius of the circle
    //console.log(width, height);
    let pack = d3.pack()
        .size([width , height ])
        .padding(1.5);
    let forceCollide = d3.forceCollide(d => d.r + 1);

    // use the force
    let simulation = d3.forceSimulation()
    // .force('link', d3.forceLink().id(d => d.id))
        .force('charge', d3.forceManyBody())
        .force('collide', forceCollide)
        // .force('center', d3.forceCenter(centerX, centerY))
        .force('x', d3.forceX(centerX ).strength(strength))
        .force('y', d3.forceY(centerY ).strength(strength));

    // reduce number of circles on mobile screen due to slow computation
    if ('matchMedia' in window && window.matchMedia('(max-device-width: 767px)').matches) {
        data = data.filter(el => {
            return el.value >= 50;
        });
    }

    let root = d3.hierarchy({ children: data })
        .sum(d => d.value);
    // we use pack() to automatically calculate radius conveniently only
    // and get only the leaves
    let nodes = pack(root).leaves().map(node => {
        console.log('node:', node.x, (node.x - centerX) * 2);
        const data = node.data;
        return {
            x: centerX + (node.x - centerX) * 3, // magnify start position to have transition to center movement
            y: centerY + (node.y - centerY) * 3,
            r: 0, // for tweening
            radius: node.r, //original radius
            id: data.cat + '.' + (data.name.replace(/\s/g, '-')),
            cat: data.cat,
            name: data.name,
            value: data.value,
            icon: data.icon,
            desc: data.desc,
            display_name_radius: 80,
        }
    });

    //changing the position of nodes when dragged
    simulation.nodes(nodes).on('tick', ticked);
    //svg.style('background-color', '#eee');
    let node = svg.selectAll('.node')
        .data(nodes)
        .enter().append('g')
        .attr('class', 'node')
        .call(d3.drag()
            .on('start', (d) => {
                if (!d3.event.active) simulation.alphaTarget(0.2).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (d) => {
                d.fx = d3.event.x;
                d.fy = d3.event.y;
            })
            .on('end', (d) => {
                if (!d3.event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }));

    //appending circle to the node
    node.append('circle')
        .attr('id', d => d.id)
        .attr('r', 0)
        .style('fill', d => "url("+d.icon+")")   //.style('fill', d => scaleColor(d.cat))
        .style('fill', d => scaleColor(d.cat))
        .transition().duration(2000).ease(d3.easeElasticOut)
        .tween('circleIn', (d) => {
            let i = d3.interpolateNumber(0, d.radius);
            return (t) => {
                d.r = i(t);
                simulation.force('collide', forceCollide);
            }
        })

    //appending a clipPath to the node
    node.append('clipPath')
        .attr('id', d => `clip-${d.id}`)
        .append('use')
        .attr('xlink:href', d => `#${d.id}`);

    // display text as circle icon
    node.filter(d => !String(d.icon).includes(''))  //img here
        .append('text')
        .classed('node-icon', true)
        .attr('clip-path', d => `url(#clip-${d.id})`)
        .selectAll('tspan')
        .data(d => d.icon.split(';'))
        .enter()
        .append('tspan')
        .attr('x', 0)
        .attr('y', (d, i, nodes) => (13 + (i - nodes.length / 2 - 0.5) * 10))
        .text(name => name);

    // display image as circle icon
    node.filter(d => String(d.icon).includes('')) //img here
        .append('image')
        .classed('node-icon', true)
        .attr('xlink:href', d => d.icon)
        .attr('x', d => - d.radius)
        //.attr('x', d => - d.radius*0.7)
        .attr('y', d => - d.radius)
        //.attr('y', d => - d.radius*0.7)
        //.attr('height', d => d.radius * 2 * 0.7)
        .attr('width', d => d.radius * 2)
        //.attr('width', d => d.radius * 2 *0.7)
        .attr('clip-path', d => `url(#clip-${d.id})`)
    node.append('title')
        .text(d => (d.cat + '::' + d.name + '\n' + format(d.value)));

    //appending a div that contains the title and the description of the movie.
    let infoBox = node.append('foreignObject')
        .classed('circle-overlay hidden', true)
        .attr('x', -370 * 0.5 * 0.7)  //.attr('x', -350 * 0.5 * 0.8)
        .attr('y', -370 * 0.5 * 0.72)   //.attr('y', -350 * 0.5 * 0.8)
        .attr('height', 370 * 0.7)   //.attr('height', 350 * 0.8)
        .attr('width', 370 * 0.7)   //.attr('width', 350 * 0.8)
        .append('xhtml:div')
        .classed('circle-overlay__inner', true);
    infoBox.append('h2')
        .classed('circle-overlay__title', true)
        .text(d => d.name);
    infoBox.append('p')
        .classed('circle-overlay__body', true)
        .html(d => d.desc);
    let titleBox = node.append('foreignObject')
        .classed('titleBox hidden', true)
        .attr('x', -180 * 0.5 * 0.7)  //.attr('x', -350 * 0.5 * 0.8)
        .attr('y', -180 * 0.5 * 0.72)   //.attr('y', -350 * 0.5 * 0.8)
        .attr('height', 180 * 0.7)   //.attr('height', 350 * 0.8)
        .attr('width', 180 * 0.7)   //.attr('width', 350 * 0.8)
        .append('xhtml:div')
        .classed('circle-overlay__inner', true);
    titleBox.append('h2')
        .text(d => d.name);
    titleBox.append('h4')
        .text('Click For More')
    //on click on the node it movies the circle to the middle of the svg, increases the radius of the circle to half of the width and
    //displays the movie title and description

    node.on('click', (currentNodeClicked) => { //click
        console.log('was clicked');
        d3.event.stopPropagation();
        console.log('currentNode', currentNodeClicked);
        //d3.selectAll('.titleBox').classed('hidden', true);
        let currentTargetClicked = d3.event.currentTarget; // the <g> el
        if (currentNodeClicked === focusedNodeClicked) {
            // if same node is clicked do nothing
            return;
        }
        let lastNodeClicked = focusedNodeClicked;
        focusedNodeClicked = currentNodeClicked;
        simulation.alphaTarget(0.2).restart();

        // hide for all nodes.
        d3.selectAll('.circle-overlay').classed('hidden', true);
        d3.selectAll('.node-icon').classed('node-icon--faded', false);
        d3.selectAll('.node-icon').classed('hidden', false);
        //if lastNodeClicked exist slowing return to its original size
        if (lastNodeClicked) {
            console.log('last node')
            lastNodeClicked.fx = null;
            lastNodeClicked.fy = null;
            node.filter((d, i) => i === lastNodeClicked.index)
                .transition().duration(2000).ease(d3.easePolyOut)
                .tween('circleOut', () => {
                    let irl = d3.interpolateNumber(lastNodeClicked.r, lastNodeClicked.radius);
                    return (t) => {
                        lastNodeClicked.r = irl(t);
                    }
                })
                .on('interrupt', () => {
                    lastNodeClicked.r = lastNodeClicked.radius;
                });
        }
        // increase the size of the circle and center it.
        d3.transition('BigCircleCenter').duration(2000).ease(d3.easePolyOut)  //2000
            .tween('moveIn', () => {
                clicked = currentNodeClicked;
                console.log('tweenMoveIn', currentNodeClicked);
                let ix = d3.interpolateNumber(currentNodeClicked.x, centerX);
                let iy = d3.interpolateNumber(currentNodeClicked.y, centerY);
                let ir = d3.interpolateNumber(currentNodeClicked.r, centerY * 0.5);
                return function (t) {
                    // console.log('i', ix(t), iy(t));
                    currentNodeClicked.fx = ix(t);
                    currentNodeClicked.fy = iy(t);
                    currentNodeClicked.r = ir(t);
                    simulation.force('collide', forceCollide);
                };
            })
            .on('end', () => {
                d3.selectAll('.titleBox').classed('hidden', true);
                simulation.alphaTarget(0);
                //displaying title of the movie and the description of the movie
                let $currentGroup = d3.select(currentTargetClicked);
                $currentGroup.select('.circle-overlay')
                    .classed('hidden', false);
                $currentGroup.select('.node-icon')
                    .classed('hidden', true);
            })
            .on('interrupt', () => {
                console.log('move interrupt clicked', currentNodeClicked);
                currentNodeClicked.fx = null;
                currentNodeClicked.fy = null;
                simulation.alphaTarget(0);
            });
    });
    // blur


    /* Trying to do mouseover */
    //on mouseover on the node increase the radius of the circle to 70 and display the name of the movie
    node.on('mouseover', (currentNode) => { //click
        d3.event.stopPropagation();
        console.log('currentNode', currentNode);
        let currentTarget = d3.event.currentTarget; // the <g> el
        if (currentNode === focusedNode || currentNode === focusedNodeClicked) {
            // no focusedNode or same focused node is clicked
            return
        }
        let lastNode = focusedNode;
        focusedNode = currentNode;
        simulation.alphaTarget(0.2).restart();
        // hide all circle-overlay
        if (focusedNodeClicked){
            //focusedNodeClicked.select()
            //focusedNodeClicked.select('.node-icon').classed('node-icon--faded', false);
            d3.select(this).select('.node-icon').classed('node-icon--faded', true);
        }
        d3.selectAll('.titleBox').classed('hidden', true);
        d3.selectAll('.node-icon').classed('node-icon--faded', false);
        if (lastNode && lastNode != focusedNodeClicked) {
            lastNode.fx = null;
            lastNode.fy = null;
            node.filter((d, i) => i === lastNode.index)
                .transition().duration(700).ease(d3.easePolyOut)
                .tween('circleOut', () => {
                    if (lastNode.r > lastNode.radius && lastNode.r != 80){
                        //let irl = d3.interpolateNumber(lastNode.r, centerY * 0.5);
                        //return (t) => {
                         //   lastNode.r = irl(t);
                       // }
                    }
                    else {
                        let irl = d3.interpolateNumber(lastNode.r, lastNode.radius);
                        return (t) => {
                            lastNode.r = irl(t);
                        }
                    }

                })
                .on('interrupt', () => {
                    lastNode.r = lastNode.radius;
                });
        }

        d3.transition('SmallCircle').duration(700).ease(d3.easePolyOut)  //2000
            .tween('moveIn', () => {
                if (currentNode.r === centerY * 0.5){
                    let irl = d3.interpolateNumber(currentNode.r, centerY * 0.5);
                    return (t) => {
                        currentNode.r = irl(t);
                        simulation.force('collide', forceCollide);
                    }
                }
                else {
                    let irl = d3.interpolateNumber(currentNode.r, currentNode.display_name_radius);
                    return (t) => {
                        currentNode.r = irl(t);
                        simulation.force('collide', forceCollide);
                    }
                }
            })
            .on('end', () => {
                simulation.alphaTarget(0);
                let $currentGroup = d3.select(currentTarget);
                $currentGroup.select('.titleBox')
                    .classed('hidden', false);
                $currentGroup.select('.node-icon')
                    .classed('node-icon--faded', true);
            })
            .on('interrupt', () => {
                console.log('move interrupt', currentNode);
                //currentNode.fx = null;
                //currentNode.fy = null;
                currentNode.r = currentNode.radius;
                simulation.alphaTarget(0);
            });
    });

    /*Trying to do mouseover end */

    //when clicked outside return all nodes to original size
    d3.select(document).on('click', () => {  //click
        let targetClicked = d3.event.target;
        d3.selectAll('.titleBox').classed('hidden', true);
        // check if click on document but not on the circle overlay
        if (!targetClicked.closest('#circle-overlay') && focusedNodeClicked || focusedNode) {
            focusedNodeClicked.fx = null;
            focusedNodeClicked.fy = null;
            focusedNode.fx = null;
            focusedNode.fy = null;
            simulation.alphaTarget(0.2).restart();
            d3.transition().duration(2000).ease(d3.easePolyOut)   //2000
                .tween('moveOut', function () {
                    //console.log('tweenMoveOut', focusedNodeClicked);
                    let ir1 = d3.interpolateNumber(focusedNode.r, focusedNode.radius);
                    let ir = d3.interpolateNumber(focusedNodeClicked.r, focusedNodeClicked.radius);
                    return function (t) {
                        focusedNodeClicked.r = ir(t);
                        focusedNode.r = ir1(t);
                        simulation.force('collide', forceCollide);
                    };
                })
                .on('end', () => {
                    focusedNode = null;
                    focusedNodeClicked = null;
                    simulation.alphaTarget(0);
                })
                .on('interrupt', () => {
                    simulation.alphaTarget(0);
                });
            // hide all circle-overlay
            d3.selectAll('.node-icon').classed('hidden', false);
            d3.selectAll('.titleBox').classed('hidden', true);
            d3.selectAll('.circle-overlay').classed('hidden', true);
            d3.selectAll('.node-icon').classed('node-icon--faded', false);
        }
    });

    // d3.select(document).on('mouseover', () => {  //click
    //     let targetClicked = d3.event.target;
    //     // check if click on document but not on the circle overlay
    //     if (focusedNode) {
    //         focusedNode.fx = null;
    //         focusedNode.fy = null;
    //         simulation.alphaTarget(0.2).restart();
    //         d3.transition().duration(2000).ease(d3.easePolyOut)   //2000
    //             .tween('moveOut', function () {
    //                 console.log('tweenMoveOut', focusedNode);
    //                 let ir = d3.interpolateNumber(focusedNode.r, focusedNode.radius);
    //                 return function (t) {
    //                     focusedNode.r = ir(t);
    //                     simulation.force('collide', forceCollide);
    //                 };
    //             })
    //             .on('end', () => {
    //                 focusedNode = null;
    //                 simulation.alphaTarget(0);
    //             })
    //             .on('interrupt', () => {
    //                 simulation.alphaTarget(0);
    //             });
    //         // hide all circle-overlay
    //         d3.selectAll('.circle-overlay').classed('hidden', true);
    //         d3.selectAll('.node-icon').classed('node-icon--faded', false);
    //     }
    // });

    function ticked() {
        node
            .attr('transform', d => `translate(${d.x},${d.y})`)
            .select('circle')
            .attr('r', d => d.r);
    }
});