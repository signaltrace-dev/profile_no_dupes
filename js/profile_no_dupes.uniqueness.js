/**
 * @file
 * Modified version of uniqueness.js - custom functionality for Profile modals
 */

(function($) {
  var uniqueness;

  function selectProfile(nid, fullName, targetField){
    if(nid && nid.length > 0){
      var targetElem;
      if(targetField && targetField.length > 0){targetElem = '#' + targetField;}
      if(fullName.length > 0){
        var nameWithNid = fullName + ' (' + nid + ')';
        if(targetElem){
          if(targetField ===  'edit-field-participant-name-und' || targetField === 'edit-field-student-profile-und' || targetField === 'edit-field-presenter-profile-und'){
            if(targetField ===  'edit-field-participant-name-und' || targetField === 'edit-field-student-profile-und'){
              $('#edit-title').val(fullName);
            }
            $(targetElem).val(nameWithNid);
          }
          else{
              var originalVal = $(targetElem).val();
              if(originalVal && originalVal.length > 0){
                if(originalVal.indexOf(nid) < 0){
                  $(targetElem).val(originalVal + ', ' + nameWithNid);
                }
              }
            else{
              $(targetElem).val(nameWithNid);
            }
          }
          Drupal.CTools.Modal.dismiss();
        }
      }
    }
  }

  $(document).ready(function(){
    $('#pnl-hdn-profile-added input[type=hidden]').change(function(){
      var nid = String($(this).val());
      var fullName = $('#pnl-hdn-profile-name-added input[type=hidden]').val();
      if(nid && nid.length > 0 && fullName && fullName.length > 0){
        var targetField = $('#pnl-hdn-profile-field input[type=hidden]').val();

        selectProfile(nid, fullName, targetField);
      }
    });
  });

  Drupal.behaviors.uniqueness = {
    attach: function (context) {
      if (!uniqueness) {
        uniqueness = new Drupal.uniqueness(Drupal.settings.uniqueness['URL'], $('.uniqueness-dyn'));
      }
      // Search off title.
      $('#edit-title, .field-title', context).once('uniqueness', function() {
        $(this).keyup(function() {
          input = this.value;
          if (input.length >= uniqueness.minCharacters) {
            uniqueness.search('title', input);
          }
          else if(input.length == 0 && !uniqueness.prependResults) {
            uniqueness.clear();
          }
        });
      });
      // Search off tags.
      $('#edit-taxonomy-tags-1').once('uniqueness', function() {
        $(this).blur(function() {
          input = this.value;
          // Some tags set.
          if (input.length > 0) {
            uniqueness.search('tags', input);
          }
        });
      });

      uniqueness.bindHandlers();
    }
  };

  Drupal.uniqueness = function (uri, widget) {
    this.uri = uri;
    this.delay = 500;
    this.widget = widget;
    this.list = $('.item-list ul', widget);
    this.notifier = $('.uniqueness-search-notifier', widget);
    this.widgetCSS = {
      'background-image' : "url('" + Drupal.settings.basePath + "misc/throbber.gif" + "')",
      'background-position' : '100% -18px',
      'background-repeat' : 'no-repeat'
    };
    this.searchCache = {};
    this.listCache = {};
    this.prependResults = Drupal.settings.uniqueness['prependResults'];
    this.nid = Drupal.settings.uniqueness['nid'];
    this.type = Drupal.settings.uniqueness['type'];
    this.minCharacters = Drupal.settings.uniqueness['minCharacters'];
    this.autoOpen = $(widget).closest('fieldset');
  }

  Drupal.uniqueness.prototype.update = function (data) {
    var expand = false;
    uniqueness.widget = $('.uniqueness-dyn');
    uniqueness.list = $('.item-list ul', uniqueness.widget);
    uniqueness.notifier = $('.uniqueness-search-notifier', uniqueness.widget);
    uniqueness.notifier.removeClass('uniqueness-dyn-searching').empty();
    uniqueness.widget.css('background-image', '');
    uniqueness.autoOpen = $(uniqueness.widget).closest('fieldset');
    uniqueness = this;

    if (uniqueness.prependResults) {
      if (data == undefined && uniqueness.listCache != {}) {
        data = uniqueness.listCache;
      }
      var items = '';
      $.each(data, function(i, item) {
        // Only use what we haven't seen before.
        if (uniqueness.listCache[item.nid] == undefined) {
          items += '<li><a href="' + item.href + '" target="_blank" data-nid="' + item.nid + '">' + item.title + '</a> ' + (item.status == 0 ? '(' + Drupal.t('not published') + ')' : '') + '</li>';
          // Store the new item.
          uniqueness.listCache[item.nid] = item;
          expand = true;
        }
      });
      // Show list.
      this.list.prepend(items);
    }
    else { // Replace content. //@todo still use caching?
      $(".uniqueness-description", uniqueness.widget.parent()).toggle(data != undefined);
      if (data == undefined) {
        uniqueness.clear();
        if ($('#edit-title')[0].value.length) {
          uniqueness.notifier.html(Drupal.settings.uniqueness['noResultsString']);
        }
        return;
      }
      var items = '';
      $.each(data, function(i, item) {
        if (item.more) {
          items += '<li>' + Drupal.t("... and others.") + '</li>';
        }
        else {
          items += '<li><a class="lnk-profile" href="' + item.href + '" target="_blank" data-nid="' + item.nid + '">' + item.title + '</a> ' + (item.status == 0 ? '(' + Drupal.t('not published') + ')' : '') + '</li>';
        }
      });
      this.list.html(items);

      $('.lnk-profile').click(function(e){
        e.preventDefault();
        var targetField = $('#pnl-hdn-target-field input[name="hdn-target-field"]').val();
        //$('#pnl-hdn-profile-field input[type=hidden]').val(targetField);

        var nid = String($(this).data('nid'));
        var fullName = $(this).text();
        selectProfile(nid, fullName, targetField);

      });
      expand = items.length;
    }
    if (expand && uniqueness.autoOpen) {
      uniqueness.autoOpen.removeClass('collapsed');
      // Only auto open the fieldset once per page load.
      uniqueness.autoOpen = null;
    }
  }

  Drupal.uniqueness.prototype.search = function (element, searchString) {
    uniqueness = this;

    // If this string has been searched for before we do nothing.
    if (uniqueness.prependResults && uniqueness.searchCache[searchString]) {
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(function () {
      // Inform user we're searching.
      if (uniqueness.notifier.hasClass('uniqueness-dyn-searching') == false) {
        uniqueness.notifier.addClass('uniqueness-dyn-searching').html(Drupal.settings.uniqueness['searchingString']);
        uniqueness.widget.css(uniqueness.widgetCSS);
      }
      var query = uniqueness.uri + '?';
      if (uniqueness.nid != undefined) {
        query += 'nid=' + uniqueness.nid + '&';
      }
      if (uniqueness.type != undefined) {
        query += 'type=' + uniqueness.type + '&';
      }
      $.getJSON(query + element + '=' + searchString, function (data) {
        if (data != undefined && data != 'false') {
          // Found results.
          uniqueness.update(data);
          // Save this string, it found results.
          uniqueness.searchCache[searchString] = searchString;
          var blockSet = true;
        }
        // Nothing new found so show existing results.
        if (blockSet == undefined) {
          uniqueness.update();
        }
      });
    }, uniqueness.delay);
  }

  Drupal.uniqueness.prototype.clear = function () {
    this.list.empty();
  }

  Drupal.uniqueness.prototype.bindHandlers = function (){
    $('#edit-field-first-name input[type=text]').keyup(function(){
    var firstName = $(this).val();
    var middleName = $('#edit-field-middle-name input[type=text]').val();
    var lastName = $('#edit-field-last-name input[type=text]').val();

	var fullName = firstName;
	if(middleName.length > 0){fullName += ' ' + middleName;}
	if(lastName.length > 0){fullName += ' ' + lastName;}

        $('.field-title').val(fullName);
        $('.field-title').trigger('keyup');
    });

    $('#edit-field-middle-name input[type=text]').keyup(function(){
        var firstName = $('#edit-field-first-name input[type=text]').val();
        var middleName = $(this).val();
        var lastName = $('#edit-field-last-name input[type=text]').val();

        var fullName = firstName;
        if(middleName.length > 0){fullName += ' ' + middleName;}
        if(lastName.length > 0){fullName += ' ' + lastName;}

        $('.field-title').val(fullName);
        $('.field-title').trigger('keyup');
    });

    $('#edit-field-last-name input[type=text]').keyup(function(){
        var firstName = $('#edit-field-first-name input[type=text]').val();
        var middleName = $('#edit-field-middle-name input[type=text]').val();
        var lastName = $(this).val();

        var fullName = firstName;
        if(middleName.length > 0){fullName += ' ' + middleName;}
        if(lastName.length > 0){fullName += ' ' + lastName;}


        $('.field-title').val(fullName);
        $('.field-title').trigger('keyup');
    });




  }


})(jQuery);
