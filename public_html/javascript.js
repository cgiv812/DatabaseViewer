/* 
 * To change this template, choose Tools | Templates
 * and open the template in the editor.
 */
"use strict";
var a = {}, socket = null, numTilesPerPage = 50, resizeTimer = null, changes = [], urlQuery = {}, sort = {};
a.imageList = new Array();

$(function() {
    urlQuery = {
        query: null,
        sort: null,
        mode: 'query',
        titleStart: null
    };
    a.divProps = {};
    a.divProps.size = 150;
    a.divProps.spacing = {W: 50, H: 100};
    a.divProps.zoomMult = 1.3;
    a.imageList = [];
    a.len = 0;
    a.data = {};
    $(window).resize(function() {
        //set a timer so the resize function only fires when the resize has ended
        if (!urlQuery.tileStart)
            return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            a.width = $(document).width();
            a.height = $(document).height();
            createDivs();
        }, 150);
    });
    initQuery();
    $('.queryInput').on('keyup', function(e) {
        if ((e.keyCode || e.which) === 13 && $(this).val() !== '') {
            getQuery();
        }
    });
    $('#submit').click(function() {
        getQuery();
    });
    $('#back').click(function() {
        $('#albums').empty();
        $('#back').hide();
        $('#prev').hide();
        $('#next').hide();
        $('#submitEdits').hide();
        $('#sorryLbl').hide();
        $('#query').show();
        $("#titleInput").focus();
        $('h1').text('Query Database');
        History.pushState({query: null, sort: null, mode: urlQuery.mode, tileStart: null}, null, '/');
        a.imageList = [];
        a.len = 0;
        a.data = {};
    });
    $('#prev').hover(function() {
        $(this).css('color', 'red');
    }, function() {
        $(this).css('color', 'blue');
    });
    $('#next').hover(function() {
        $(this).css('color', 'red');
    }, function() {
        $(this).css('color', 'blue');
    });
    $('#back').hover(function() {
        $(this).css('color', 'red');
    }, function() {
        $(this).css('color', 'blue');
    });
    $('#prev').click(function() {
        if (a.len % numTilesPerPage !== 0)
            a.len -= a.len % numTilesPerPage + numTilesPerPage;
        else
            a.len -= 2 * numTilesPerPage;
        History.pushState({query: urlQuery.query, sort: urlQuery.sort, mode: urlQuery.mode, tileStart: a.len}, null, '/');
    });
    $('#next').click(function() {
        History.pushState({query: urlQuery.query, sort: urlQuery.sort, mode: urlQuery.mode, tileStart: a.len}, null, '/');
    });
    connect();
    console.log(History.getState().data);
    if (History.getState().data.query) {
        console.log("I think there's something here");
        urlQuery = History.getState().data;
        if (urlQuery.tileStart) {
            a.len = parseInt(urlQuery.tileStart);
        } else {
            a.len = 0;
        }
        $('#query').hide();
        getData();
    } else {
        $.each(window.location.search.substring(1).split('&'), function() {
            urlQuery[this.split('=')[0]] = this.split('=')[1];
        });
    }
    console.log(urlQuery);
    if (urlQuery.mode === 'edit') {
        numTilesPerPage = 30;
        History.replaceState({query: urlQuery.query, sort: urlQuery.sort, mode: 'edit', tileStart: urlQuery.titleStart}, null, '/');
    } else {
        urlQuery.mode = 'query';
        History.replaceState({query: urlQuery.query, sort: urlQuery.sort, mode: 'query', tileStart: urlQuery.titleStart}, null, '/');
    }
    History.Adapter.bind(window, 'statechange', function() {
        urlQuery = History.getState().data;
        if (urlQuery.query && urlQuery.tileStart) {
            a.len = parseInt(urlQuery.tileStart);
            $('#query').hide();
            getData();
        } else {
            initQuery();
        }
    });
});

var initQuery = function() {
    $('#back').hide();
    $('#prev').hide();
    $('#next').hide();
    $('#sorryLbl').hide();
    $('#submitEdits').hide();
    $('#albums').empty();
    $('#query').show();
    $('h1').text('Query Database');
    $("#titleInput").focus();
};

var getData = function() {
    if (!a.data.thumbs) {
        $('#query').hide();
        a.imageList = [];
        a.data = {};
        urlQuery.sort = urlQuery.sort || {date: -1};
        console.log('retrieve');
        socket.emit('retrieve', {find: urlQuery.query, sort: urlQuery.sort});
    } else {
        dispNext();
    }
};

var connect = function() {
    socket = io.connect('http://mosaic.disp.duke.edu:8080');
    socket.on('data', function(imgs) {
        extractData(imgs);
    });
    socket.on('updated', function() {
        $('#submitEdits').css({color: 'green', cursor: 'default'});
        $('#submitEdits').unbind('mouseenter mouseleave click');
    });
};

var getKeys = function(obj) {
    var keys = [];
    for (var key in obj) {
        keys.push(key);
    }
    return keys;
};

var extractData = function(imgs) {
    //add the response of the query to the webpage
    if (imgs.length > 0) {
        if (urlQuery.mode === 'edit')
            $('#submitEdits').show();
        a.data = {thumbs: [], names: [], urls: [], images: imgs};

        for (var k = 0; k < imgs.length; k++) {
            a.data.thumbs[k] = imgs[k].urlLocation + "/" + JSON.parse(imgs[k].outputFiles.replace(/\'/g, '"')).zoomify + '/TileGroup0/0-0-0.jpg';
            a.data.names[k] = imgs[k].title;
            a.data.urls[k] = '/ZoomIndex.html?' + imgs[k].urlLocation + "/" + JSON.parse(imgs[k].outputFiles.replace(/\'/g, '"')).zoomify;
        }
        dispNext();
    }
    else {
        $('#sorryLbl').show();
        $('#back').show();
    }

};


var dispNext = function() {
    window.scrollTo(0, 0);
    $('#albums').empty();
    a.imageList = [];
    var prevLen = a.len;
    if (a.data.thumbs.length <= a.len + numTilesPerPage)
        a.len = a.data.thumbs.length;
    else
        a.len += numTilesPerPage;
    for (var k = prevLen; k < a.len; k++) {
        addImage(a.data.thumbs[k], a.data.names[k], a.data.urls[k], a.data.images[k]);
    }
    initialize("Composites");
};

//var dispPrev = function() {
//    window.scrollTo(0, 0);
//    $('#albums').empty();
//    a.imageList = [];
//    if (a.len % numTilesPerPage !== 0)
//        a.len = a.len - a.len % numTilesPerPage;
//    else
//        a.len -= numTilesPerPage;
//    for (var k = a.len - numTilesPerPage; k < a.len; k++) {
//        addImage(a.data.thumbs[k], a.data.names[k], a.data.urls[k], a.data.images[k]);
//    }
//    History.pushState({query: query, sort: sort, mode: urlQuery.mode, tileStart: a.len}, null, "?mode=" + urlQuery.mode + "&tileStart=" + (a.len - 2 * numTilesPerPage));
//    initialize("Composites");
//};

var initialize = function(albumName) {
    $('#next').hide();
    $('#prev').hide();
    $('#back').show();
    a.width = $(document).width();
    a.height = $(document).height();
    $('h1').text(albumName);
    createDivs();
};

var addImage = function(thumbnail, name, url, image) {
    a.imageList.push({thumbnail: thumbnail, name: name, url: url, image: image});
};

var createDivs = function() {
    if (urlQuery.mode === 'edit') {
        a.divProps.spacing.W = 200;
    }
    $('#albums').empty();
    var numDivsWide = Math.floor((a.width - a.divProps.spacing.W) / (a.divProps.size + a.divProps.spacing.W));
    var lBorder = (a.width - (numDivsWide * (a.divProps.size + a.divProps.spacing.W) - a.divProps.spacing.W)) / 2;
    var k = 0;
    var temp, temp2, temp3, posH, keys, image, keyLength, height = 0;
    for (posH = 200; k < a.imageList.length; posH += a.divProps.size + a.divProps.spacing.H) {        //iterating vertically
        keyLength = 0;
        for (var posW = lBorder; posW < a.width - lBorder && k < a.imageList.length; posW += a.divProps.size + a.divProps.spacing.W) {     // iterating horizontally
            temp = $('<a class="album" href="' + a.imageList[k].url + '"></div>');
            temp.css({left: posW,
                top: posH,
                background: "url('" + a.imageList[k].thumbnail + "') no-repeat 100%",
                'background-size': 'cover',
                'background-position': 'center'});
            $('#albums').append(temp);
            if (urlQuery.mode === 'query') {
                temp.addClass('hoverAlbum');
                temp2 = $('<label class="caption">' + a.imageList[k].name + '</label>');
                temp.append(temp2);
                temp.data('caption', temp2);
                temp.data('caption').data('original_position', {top: (posH + a.divProps.size + 10), left: posW});
            } else {
                image = a.imageList[k].image;
                keys = getKeys(image);
                keys = ['title', 'event', 'description', 'keywords', 'id'];
                if (keys.length > keyLength) {
                    keyLength = keys.length;
                    a.divProps.spacing.H = 25 * keyLength + 50;
                }
                for (var i = 0; i < keys.length; i++) {
                    temp2 = $('<input type="text" class="editField" id="' + k + keys[i] + '" value="' + image[keys[i]] + '">');
                    temp2.data('image', image);
                    temp2.data('key', keys[i]);
                    temp3 = $('<label>' + keys[i] + ':</label>');
                    temp3.css({position: 'absolute', 'text-align': 'right', right: a.width - posW + 10, top: posH + a.divProps.size + 10 + 25 * i, 'z-index': 1});
                    temp2.css({position: 'absolute', left: posW, top: posH + a.divProps.size + 10 + 25 * i, 'z-index': 2});
                    temp2.focus(function() {
                        changes[changes.length] = {element: $(this), key: $(this).data('key'), _id: $(this).data('image')._id};
                        $('#submitEdits').show();
                        $('#submitEdits').hover(function() {
                            $(this).css('color', 'red');
                        }, function() {
                            $(this).css('color', 'blue');
                        });
                        $('#submitEdits').css({color: 'blue', cursor: 'pointer'});
                        $('#submitEdits').click(function() {
                            var set = {};
                            for (var k = 0; k < changes.length; k++) {
                                set[changes[k].key] = changes[k].element.val();
                                socket.emit('edit', {find: {_id: changes[k]._id}, replace: set});
                            }
                        });
                    });
                    $('#albums').append(temp2);
                    $('#albums').append(temp3);
                }
            }
            height = posH + a.divProps.size + a.divProps.spacing.H;
            k++;
        }
    }

    if (urlQuery.mode === 'edit') {
        $('#submitEdits').css('top', height);
        height += 70;
    }

    if (a.len < a.data.thumbs.length)
        $('#next').show();
    if (a.len > numTilesPerPage)
        $('#prev').show();

    $('#next').css({top: height});
    $('#prev').css({top: height});
};

var getQuery = function() {
    urlQuery.sort = {};
    urlQuery.query = [];
    urlQuery.sort[$('#sort').val()] = $('#ad').val();
    if ($('#titleInput').val() !== '')
        urlQuery.query[urlQuery.query.length] = {title: {$regex: '\\b' + $('#titleInput').val() + '\\b', $options: 'i'}};
    if ($('#eventInput').val() !== '')
        urlQuery.query[urlQuery.query.length] = {event: {$regex: '\\b' + $('#eventInput').val() + '\\b', $options: 'i'}};
    if ($('#keyInput').val() !== '')
        urlQuery.query[urlQuery.query.length] = {description: {$regex: '\\b' + $('#keyInput').val() + '\\b', $options: 'i'}};
    if ($('#idInput').val() !== '')
        urlQuery.query[urlQuery.query.length] = {id: {$regex: '^' + $('#idInput').val() + '$', $options: 'i'}};
    if (urlQuery.query.length === 0)
        urlQuery.query = {};
    History.pushState({query: urlQuery.query, sort: urlQuery.sort, mode: urlQuery.mode, tileStart: a.len}, null, '/');
    $('#query').hide();
    getData();
};