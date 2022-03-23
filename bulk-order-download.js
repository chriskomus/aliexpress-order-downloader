// ==UserScript==
// @name         AliExpress Bulk Order Exporter
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Show tracking info, and bulk export tab delimited AliExpress orders into the Clipboard.
// @author       Chris Komus
// @match        https://www.aliexpress.com/p/order/index.html
// @grant        GM_setClipboard
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @require      https://www.17track.net/externalcall.js
// @run-at       document-idle
// ==/UserScript==

'use strict';

// Config
// ------

// Some products have multiple pieces per single item sold and are usually denoted with something like '10pcs'
// When checking product titles and options, if it ontains text in the exclusions list, keep them at 1 piece per item.
// ie: "10pcs Widgets" will have 10 pieces per item, whereas "2pcs Ear Pads" will have 1 piece per item.
var exclusions = ['earpad', 'ear pad'];


// AliExpress Bulk Order Exporter
// -------------------------------

var orders = [];
var items = [];
var trackingNumbers = [];
var ordersWithTracking = [];

$(document).ready(function() {
    refreshData();
    displayButtons();
});

function refreshData() {
    $('.appended-tracking-number').remove();
    orders = [];
    items = [];
    trackingNumbers = [];
    ordersWithTracking = [];

    setTimeout(function() {
        getTrackingNumbers();
        getOrderData();
    }, 1000);

    setTimeout(function() {
        ordersWithTracking = mergeArrays(orders, trackingNumbers, "orderId");
        displayTrackingNumbers();
    }, 1500);
}

function getDate(txt)
{
    // Convert 'Mon D, YYYY' string into Date format
    const options = { weekday: undefined, year: 'numeric',
                month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'};

    let date = new Date(txt.slice(-5),
                        new Date(Date.parse(txt.slice(0,3) +" 1, 2022")).getMonth(),
                        txt.substring(txt.indexOf(' ')+1,txt.indexOf(",")),
                        0,0,0,0);

    return date.toLocaleDateString(undefined, options);
}

function getTrackingNumbers() {
    $(".order-item").each((ind, eo)=>{
        let orderId = $(eo).find(".order-item-header-right-info").text().trim().substring(
                      $(eo).find(".order-item-header-right-info").text().trim().indexOf("ID: ") + 4,
                      $(eo).find(".order-item-header-right-info").text().trim().lastIndexOf("Copy")).trim();

        // Tracking Information
        if ($(eo).find('.comet-btn').length === 0) {
            // let order = {};
            // order.orderId = orderId;
            // order.trackingNumber = '';
            // order.trackingNumberFromLogistics = '';
            // order.trackingUrl = '';
            // order.trackingStatus = '';
            // order.trackingStatusDate = '';
            // trackingNumbers.push(order);
        }
        else {
            var request = $.ajax({
                url:document.location.protocol+'//ilogisticsaddress.aliexpress.com/ajax_logistics_track.htm?orderId=' + orderId + '&callback=getTrackingNumber',
                dataType:'jsonp',
                timeout: 3000
            });
            getTrackingNumber = function(data){
                let order = {};
                order.orderId = data.cainiaoUrl.split('=')[1];
                order.trackingNumber = data.tracking[0].mailNo;
                order.trackingNumberFromLogistics = data.tracking[0].mailNo;
                order.trackingUrl = 'https://t.17track.net/en#nums='+order.trackingNumber;
                order.trackingStatus = data.tracking[0].keyDesc;
                let trackDate = new Date(data.tracking[0].traceList[0].eventTime);
                order.trackingStatusDate = trackDate.getMonth()+1 + '/' + trackDate.getDate() + '/' + trackDate.getFullYear();
                trackingNumbers.push(order);
            };
        }
    });
}

function getOrderData() {
    $(".order-item").each((ind, eo)=>{
        let order = {};
        let orderDateAndId = $(eo).find(".order-item-header-right-info").text().trim();

        order.orderId =      orderDateAndId.substring(
                             orderDateAndId.indexOf("ID: ") + 4,
                             orderDateAndId.lastIndexOf("Copy")).trim();
        order.date =         new Date (orderDateAndId.substring(
                             orderDateAndId.indexOf("date: ") + 6,
                             orderDateAndId.lastIndexOf("Order ID")));
        order.dateString =   order.date.getMonth()+1 + '/' + order.date.getDate() + '/' + order.date.getFullYear();

        order.total =        $(eo).find(".order-item-content-opt-price-total").text().split('Total:').pop().replace(/[^\d.-]/g, '');
        order.storeName =    $(eo).find(".order-item-store-name").text().trim();
        order.subtotal =       $(eo).find(".order-item-content-opt-price-total").text().split('Total:').pop().replace(/[^\d.-]/g, '');
        order.shippingAndTax = (order.total - order.subtotal).toFixed(2);
        order.orderStatus =    $(".order-block-title").text().trim();

        orders.push(order);

        // Testing
        // console.log(order);

        // Products
        getProductData(order, eo);

        // Append To Page
        // displayOrderContent(order, eo);
    });
}

function getProductData(order, eo) {
    var products = [];
    // $(eo).find(".order-item").each((i,eb)=>{
    if ($(eo).find(".order-item-content-img-list").length) {
        $(eo).find(".order-item-content-img").each((i,ep)=>{
            // let priceQuantityLine = $(ep).find(".order-item-content-info-number").text().trim();
            // let productTitle =      $(ep).find(".order-item-content-info-name").text().trim();
            // let productOption =     $(ep).find(".order-item-content-info-sku").text().trim();
            // let productPrice =      priceQuantityLine.split('x')[0].replace(/[^\d.-]/g, '');
            // let productQuantity =   priceQuantityLine.split('x').pop();
            // let productPcsPerPack = getPiecesPerPack([productTitle, productOption], exclusions);

            let product = {
                // productTitle:       productTitle,
                // productOption:      productOption,
                // productPrice:       productPrice,
                // productQuantity:    productQuantity,
                // productPcsPerPack:  productPcsPerPack,
                // productTotalQty:    productQuantity * productPcsPerPack,
                // productLandedCost:  ((((productPrice * productQuantity) / order.subtotal).toFixed(2) * order.total) / (productQuantity * productPcsPerPack)),
                productUrl:         "https:" + $(ep).find("a").attr('href'),
                // productImageUrl:    $(ep).find(".order-item-content-img").css('background-image').replace('url(','').replace(')','').replace(/\"/gi, ""),
                order:             order,
            };
            console.log(product);
            products.push(product);
            items.push(product);
        });
    }
    else {
        $(eo).find(".order-item-content-body").each((i,ep)=>{
            let priceQuantityLine = $(ep).find(".order-item-content-info-number").text().trim();
            let productTitle =      $(ep).find(".order-item-content-info-name").text().trim();
            let productOption =     $(ep).find(".order-item-content-info-sku").text().trim();
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
                productLandedCost:  ((((productPrice * productQuantity) / order.subtotal).toFixed(2) * order.total) / (productQuantity * productPcsPerPack)),
                productUrl:         "https:" + $(ep).find(".order-item-content-info-name").find("a").attr('href'),
                productImageUrl:    $(ep).find(".order-item-content-img").css('background-image').replace('url(','').replace(')','').replace(/\"/gi, ""),
                order:             order,
            };
            console.log(product);
            products.push(product);
            items.push(product);
        });
    }



    // });
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

function mergeArrays(arrayOne, arrayTwo) {
    let merged = [];

    for(let i=0; i<arrayOne.length; i++) {
        merged.push({...arrayOne[i],...(arrayTwo.find((itmInner) => itmInner.orderId === arrayOne[i].orderId))});
    }

    return merged;
}

function displayTrackingNumbers() {
    $(".order-item").each((ind, eo)=>{
        var orderId = $(eo).find(".order-item-header-right-info").text().trim().substring(
                      $(eo).find(".order-item-header-right-info").text().trim().indexOf("ID: ") + 4,
                      $(eo).find(".order-item-header-right-info").text().trim().lastIndexOf("Copy")).trim();

        let order = ordersWithTracking.find(o => o.orderId === orderId);

        $(eo).find(".order-item-header-status-text").append('<span class="appended-tracking-number">: <a href="' + order.trackingUrl + '" target="_blank">' + order.trackingNumber + '</a></span>');
    });
}

function copyHeadersToClipboard() {
    $("#headerBtn").text("Copied");
    var h = "";
    {
        h += "Order Number" + "\t";
        h += "Order Date" + "\t";
        h += "Subtotal" + "\t";
        h += "Shipping and Tax" + "\t";
        h += "Total Order Amount" + "\t";
        h += "Store Name" + "\t";
        h += "Order Status" + "\t";
        h += "Tracking Number" + "\t";
        h += "Tracking Status" + "\t";
        h += "Tracking Status Last Updated" + "\t";
        h += "Tracking Link" + "\t";
        h += "Product Title" + "\t";
        h += "Option" + "\t";
        h += "Price" + "\t";
        h += "Quantity" + "\t";
        h += "Pieces Per Pack" + "\t";
        h += "Total Quantity" + "\t";
        h += "Landed Cost" + "\t";
        h += "Product URL" + "\t";
        h += "Image URL" + "\t";
    };
    GM_setClipboard (h);
    $("#headerBtn").text("Copied");
}

function copyOrdersToClipboard() {
    $("#csvBtn").text("Loading...");
    var s = "";
    items.forEach(e=> {
        let order = ordersWithTracking.find(o => o.orderId === e.order.orderId);

        s += e.order.orderId + "\t";
        s += order.dateString + "\t";
        s += e.order.subtotal + "\t";
        s += e.order.shippingAndTax + "\t";
        s += e.order.total + "\t";
        s += e.order.storeName + "\t";
        s += e.order.orderStatus + "\t";
        s += order.trackingNumber + "\t";
        s += order.trackingStatus + "\t";
        s += order.trackingStatusDate + "\t";
        s += order.trackingUrl + "\t";
        s += "\"" + e.productTitle + "\"\t";
        s += "\"" + e.productOption + "\"\t";
        s += e.productPrice + "\t";
        s += e.productQuantity + "\t";
        s += e.productPcsPerPack + "\t";
        s += e.productTotalQty + "\t";
        s += e.productLandedCost + "\t";
        s += e.productUrl + "\t";
        s += "\"" + e.productImageUrl + "\"\t";
        s += "\n";
    });
    console.log(items);
    GM_setClipboard (s);
    $("#csvBtn").text("Copied");
}

function displayButtons() {
    $('<div/>',{class:'order-header', id:'added-buttons'}).insertAfter('.order-form');

    $('<button/>', {
        text: "Show Tracking Numbers/Rescan Orders",
        id: 'headerBtn',
        class: 'comet-btn',
        click: function () {
            refreshData();
        }
    }).insertAfter("#added-buttons");

    $('<button/>', {
        text: "Show Tracking Numbers/Rescan Orders",
        id: 'headerBtn',
        class: 'comet-btn comet-btn-large comet-btn-borderless order-more',
        style: 'margin: auto;',
        click: function () {
            refreshData();
        }
    }).insertAfter(".order-more");

    $('<button/>', {
        text: "Copy Orders To Clipboard",
        id: 'csvBtn',
        class: 'comet-btn',
        click: function () {
            copyOrdersToClipboard();
        }
    }).insertAfter("#added-buttons");

    $('<button/>', {
        text: "Copy Header Row",
        id: 'headerBtn',
        class: 'comet-btn',
        click: function () {
            copyHeadersToClipboard;
        }
    }).insertAfter("#added-buttons");
}
