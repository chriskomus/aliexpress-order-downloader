// ==UserScript==
// @name         AliExpress Order Detail Exporter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Export AliExpress order details via the clipboard into csv format
// @author       Chris Komus
// @match        https://www.aliexpress.com/p/order/detail.html*
// @grant        GM_setClipboard
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://www.17track.net/externalcall.js
// @run-at       document-idle
// ==/UserScript==

'use strict';

// Config
// ------

// Some products have multiple pieces per single item sold and are usually denoted with something like '10pcs'
// When checking product titles and options exclude products containing the following.
// ie: "10pcs Widgets" will have 10 pieces per item, whereas "2pcs Ear Pads" will have 1 piece per item.
var exclusions = ['earpad', 'ear pad'];


// AliExpress Order Detail Exporter
// -------------------------------

var items = [];
var products = [];
var order = {};

$(document).ready(function() {
    // Once the page loads, wait additional time before executing since not all elements load right away.
    setTimeout(function() {
        getOrderData();
        getProductData();
    }, 2000);

    setTimeout(function() {
        // Testing
        // console.log(order);

        // Display Buttons
        displayContent();
    }, 3000);
});


function getDate(txt)
{
    // Convert 'Mon D, YYYY' string into Date format
    const options = { weekday: undefined, year: 'numeric',
                month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'};

    let date = new Date(txt.slice(-5),
                        new Date(Date.parse(txt.slice(0,3) +' 1, 2022')).getMonth(),
                        txt.substring(txt.indexOf(' ')+1,txt.indexOf(',')),
                        0,0,0,0);

    return date.toLocaleDateString(undefined, options);
}

function getOrderData() {
    // Order ID
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
    order.orderId = params.orderId.trim();

    // Tracking Information
    if ($('.copy-track-num')[0]) {
        order.trackingNumber = $('.copy-track-num').eq(0).attr('data-clipboard-text').trim();

        jQuery.ajax({
            url:document.location.protocol+'//ilogisticsaddress.aliexpress.com/ajax_logistics_track.htm?orderId=' + order.orderId + '&callback=getTrackingNumber',
            dataType:'jsonp'
        });

        getTrackingNumber = function(data){
            order.trackingNumberFromLogistics = data.tracking[0].mailNo;
            order.trackingUrl = 'https://t.17track.net/en#nums='+order.trackingNumber;
            order.trackingStatus = data.tracking[0].keyDesc;
            let trackDate = new Date(data.tracking[0].traceList[0].eventTime);
            order.trackingStatusDate = trackDate.getMonth()+1 + '/' + trackDate.getDate() + '/' + trackDate.getFullYear();
        };
    }
    else {
        order.trackingNumber = '';
        order.trackingNumberFromLogistics = '';
        order.trackingUrl = '';
        order.trackingStatus = '';
        order.trackingStatusDate = '';
    }

    order.date =           new Date (getDate($('.info-row').eq(1).text().split(':').pop().trim()));
    order.dateString =     order.date.getMonth()+1 + '/' + order.date.getDate() + '/' + order.date.getFullYear();
    order.subtotal =       $('.order-price-item').eq(0).find('.right-col').text().replace(/[^\d.-]/g, '');
    order.total =          $('.order-price-item').eq(1).find('.right-col').text().replace(/[^\d.-]/g, '');
    order.shippingAndTax = (order.total - order.subtotal).toFixed(2);
    order.storeName =      $('.store-name').text().trim();
    order.orderStatus =    $('.order-block-title').text().trim();
}

function getProductData() {
    $('.order-detail-item').each((i,eb)=>{
        $(eb).find('.order-detail-item-content').each((i,ep)=>{
            let priceQuantityLine = $(ep).find('.item-price').text().trim();
            let productTitle =      $(ep).find('.item-title').text().trim();
            let productOption =     $(ep).find('.item-sku-attr').text().trim();
            let productPrice =      priceQuantityLine.split('x')[0].replace(/[^\d.-]/g, '');
            let productQuantity =   priceQuantityLine.split('x').pop();
            let productPcsPerPack = getPiecesPerPack([productTitle, productOption], exclusions);

            let product = {
                productTitle:       productTitle,
                productOption:      productOption,
                productPrice:       productPrice,
                productQuantity:    productQuantity,
                productPcsPerPack:  productPcsPerPack,
                productTotalQty:    productQuantity * productPcsPerPack,
                productLandedCost:  (((productPrice * productQuantity) / order.subtotal).toFixed(2) * order.total) / (productQuantity * productPcsPerPack),
                productUrl:         'https:' + $(ep).find('.item-title').find('a').attr('href'),
                productImageUrl:    $(ep).find('.order-detail-item-content-img').css('background-image').replace('url(','').replace(')','').replace(/\"/gi, ''),
                order:             order,
            };
            console.log(product);
            products.push(product);
            items.push(product);
        });
    });
}

function getPiecesPerPack(checkStringForPieces, exclusions) {
    // Check the array for specific text indicating there may be multiple pieces per single item.
    // Order the array by reverse priority. ie: [Title, Option] will check Title first, then Option, keeping the latter.
    // If strings from the exclusions array appear in checkStringForPieces, it will be ignored.
    // ie: if Title or Option contains "2pcs" or "2 pieces", return 2.
    let numberOfPieces = '1';
    let pieces = ['pcs', 'pieces'];

    for (let i = 0; i < checkStringForPieces.length; i++) {
        if (checkStringForPieces[i]) {
            let checkString = checkStringForPieces[i].toLowerCase();

            for (let k = 0; k < exclusions.length; k++) {
                if (!checkString.includes(exclusions[k])) {
                    for (let j = 0; j < pieces.length; j++) {
                        if (checkString.includes(pieces[j])) {
                            numberOfPieces = checkString.substring(0,checkString.indexOf(pieces[j]));
                            var n = numberOfPieces.lastIndexOf(' ');
                            numberOfPieces = numberOfPieces.substring(n + 1);
                        }
                    }
                }
            }
        }
    }

    return numberOfPieces;
}

function displayContent() {
    $('<div class="expect-date"><span class="order-gray">Tracking Status:</span>&nbsp;&nbsp;<span id="tracking-status">' + order.trackingStatus + '</span></div>' +
              '<div class="expect-date"><span class="order-gray">Tracking Number:</span>&nbsp;&nbsp;<span id="tracking-url"><a href="' + order.trackingUrl + '" target="_blank">' + order.trackingNumberFromLogistics + '</a></span></div>' +
              '<div class="expect-date"><span class="order-gray">Tracking Last Updated:</span>&nbsp;&nbsp;<span id="tracking-status-date">' + order.trackingStatusDate + '</span></div>').insertBefore( '.expect-date' );

    $('#mybutton').one('click', function(){
        var r=$('<input/>').attr({
            type:  'button',
            id:    'field',
            value: 'LOAD CSV'
        });
        $('body').append(r);
    });

    $('<button/>', {
        text: 'Copy Order To Clipboard',
        id: 'csvBtn',
        class: 'comet-btn',
        click: function () {
            $('#csvBtn').text('Loading...');
                var s = '';
                items.forEach(e=> {
                    s += e.order.orderId + '\t';
                    s += e.order.dateString + '\t';
                    s += e.order.subtotal + '\t';
                    s += e.order.shippingAndTax + '\t';
                    s += e.order.total + '\t';
                    s += e.order.storeName + '\t';
                    s += e.order.orderStatus + '\t';
                    s += e.order.trackingNumber + '\t';
                    s += e.order.trackingStatus + '\t';
                    s += e.order.trackingStatusDate + '\t';
                    s += e.order.trackingUrl + '\t';
                    s += "\"" + e.productTitle + "\"\t";
                    s += "\"" + e.productOption + "\"\t";
                    s += e.productPrice + '\t';
                    s += e.productQuantity + '\t';
                    s += e.productPcsPerPack + '\t';
                    s += e.productTotalQty + '\t';
                    s += e.productLandedCost + '\t';
                    s += e.productUrl + '\t';
                    s += '\'' + e.productImageUrl + '\'\t';
                    s += '\n';

                });
                console.log(s);
                GM_setClipboard (s);
                $('#csvBtn').text('Copied');
        }
    }).insertBefore('.order-block-title');

    $('<button/>', {
        text: 'Copy Header Row',
        id: 'headerBtn',
        class: 'comet-btn',
        click: function () {
            $('#headerBtn').text('Copied');
                var h = '';
                {
                    h += 'Order Number' + '\t';
                    h += 'Order Date' + '\t';
                    h += 'Subtotal' + '\t';
                    h += 'Shipping and Tax' + '\t';
                    h += 'Total Order Amount' + '\t';
                    h += 'Store Name' + '\t';
                    h += 'Order Status' + '\t';
                    h += 'Tracking Number' + '\t';
                    h += 'Tracking Status' + '\t';
                    h += 'Tracking Status Last Updated' + '\t';
                    h += 'Tracking Link' + '\t';
                    h += 'Product Title' + '\t';
                    h += 'Option' + '\t';
                    h += 'Price' + '\t';
                    h += 'Quantity' + '\t';
                    h += 'Pieces Per Pack' + '\t';
                    h += 'Total Quantity' + '\t';
                    h += 'Landed Cost' + '\t';
                    h += 'Product URL' + '\t';
                    h += 'Image URL' + '\t';
                };
                GM_setClipboard (h);
                $('#headerBtn').text('Copied');
        }
    }).insertBefore('.order-block-title');
}
