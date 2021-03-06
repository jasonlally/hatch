/*globals Handlebars $ _ moment */

var Hatch = Hatch || {};

(function(NS) {
  Handlebars.registerHelper('debug', function(obj) {
    return JSON.stringify(obj);
  });

  Handlebars.registerHelper('visions_url_name', function(category) {
    return NS.appConfig.vision_plural;
  });

  Handlebars.registerHelper('get_tab_count', function(visions, supported, replies, options) {
    var tabs = 0;
    if (visions) {
      tabs++;
    }
    if (supported) {
      tabs++;
    }
    if (replies) {
      tabs++;
    }
    return tabs;
  });

  Handlebars.registerHelper('if_authenticated', function(options) {
    return !!NS.currentUserData ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('if_is_current_user', function(user_id, options) {
    return !!NS.currentUserData && NS.currentUserData['id'] == user_id ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('if_imagemanip_feature', function(options) {
    var canManipulateImages = (
      !!window.FileReader &&
      !!(new window.FileReader()).readAsArrayBuffer
    );
    return canManipulateImages ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('if_in_group', function(groupName, options) {
    var user = NS.app.currentUser;
    return (user.isAuthenticated() && user.isInGroup(groupName) ? options.fn(this) : options.inverse(this));
  });

  Handlebars.registerHelper('if_supported', function(options) {
    var userId, supportingIds;

    if (!NS.currentUserData) {
      return options.inverse(this);
    }

    userId = NS.currentUserData.id;
    // If its an array of support ids
    if (this.supporters.length > 0 && _.isObject(_.first(this.supporters))) {
      supportingIds = _.pluck(this.supporters, 'id');
    } else {
      supportingIds = this.supporters;
    }

    return _.contains(supportingIds, userId) ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('if_shared', function(options) {
    var userId, sharingIds;

    if (!NS.currentUserData) {
      return options.inverse(this);
    }

    userId = NS.currentUserData.id;
    sharingIds = this.sharers;
    return _.contains(sharingIds, userId) ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('each_category', function(options) {
    var result = '';

    NS.app.categoryCollection.each(function(category) {
      result += options.fn(_.extend(this, category.toJSON()));
    });

    return result;
  });

  Handlebars.registerHelper('each_archived_category', function(options) {
    var result = '';

    NS.app.categoryCollection.each(function(category) {
      if (!category.get('active')) {
        result += options.fn(_.extend(this, category.toJSON()));
      }
    });

    return result;
  });

  Handlebars.registerHelper('has_archived_categories', function(options) {
    var categories = NS.app.categoryCollection.toJSON(),
        i;

    for(i=0; i<categories.length; i++) {
      if (!categories[i].active) {
        return options.fn(this);
      }
    }

    return options.inverse(this);
  });

  Handlebars.registerHelper('first_active_category', function(options) {
    var categories = NS.app.categoryCollection.toJSON(),
        i;

    for (i=0; i<categories.length; i++) {
      if (categories[i].active) {
        return options.fn(_.extend(this, categories[i]));
      }
    }
  });

  Handlebars.registerHelper('if_active_category', function(name, options) {
    var category = NS.getCategory(name);
    return category && category.get('active') ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('first_of', function() {
    var options = _.last(arguments),
        values = _.initial(arguments),
        i;

    for (i = 0; i < values.length; ++i) {
      if (values[i]) return values[i];
    }
  });

  Handlebars.registerHelper('eq', function(val1, val2, options) {
    return val1 === val2 ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('CONTEXT', function() {
    return JSON.stringify(this);
  });

  Handlebars.registerHelper('STATIC_URL', function() {
    return NS.staticURL;
  });

  Handlebars.registerHelper('LOGIN_URL', function(redirectTo, options) {
    if (arguments.length === 1) {
      options = redirectTo;
      redirectTo = undefined;
    }
    return NS.getLoginUrl(redirectTo);
  });

  Handlebars.registerHelper('CSRF_TOKEN', function(options) {
    return NS.Utils.getCookie('csrftoken');
  });

  // TODO: Move this into the config
  function getTweetText (vision) {
    var visionUrl = window.location.toString(),
        username = vision.author_details.username,
        urlLength = NS.twitterConf.short_url_length,

        attribution = '@' + username + ' ',
        visionLength = 140 - attribution.length - urlLength - 3;
    return attribution + '"' + NS.Utils.truncateChars(vision.text, visionLength, '\u2026') + '" ' + visionUrl;
  }

  function linebreaks(text) {
    return text.replace(/\n/g, '<br />');
  }

  Handlebars.registerHelper('category_prompt', function(category) {
    return NS.getCategory(category).get('prompt');
  });

  Handlebars.registerHelper('window_location', function() {
    return window.location.toString();
  });

  Handlebars.registerHelper('truncated_window_location', function(maxLength) {
    return NS.Utils.truncateChars(window.location.toString(), maxLength);
  });

  // usage: {{pluralize collection.length 'quiz' 'quizzes'}}
  Handlebars.registerHelper('pluralize', function(number, single, plural) {
    return (number === 1) ? single : plural;
  });

  Handlebars.registerHelper('if_plural', function(number, options) {
    return (number !== 1) ? options.fn(this) : options.inverse(this);
  });

  Handlebars.registerHelper('fromnow', function(datetime) {
    if (datetime) {
      return moment(datetime).fromNow();
    }
    return '';
  });

  Handlebars.registerHelper('formatdatetime', function(datetime, format) {
    if (datetime) {
      return moment(datetime).format(format);
    }
    return '';
  });

  Handlebars.registerHelper('select', function(value, options) {
    var $el = $('<div/>').html(options.fn(this)),
      selectValue = function(v) {
        $el.find('[value="'+v+'"]').attr({
          checked: 'checked',
          selected: 'selected'
        });
      };

    if (_.isArray(value)) {
      _.each(value, selectValue);
    } else {
      selectValue(value);
    }

    return $el.html();
  });

  // Handlebars is presumed, but you could swap out
  var ESCAPE_EXPRESSION_FUNCTION = Handlebars.Utils.escapeExpression;
  var MARKSAFE_FUNCTION = function(str) { return new Handlebars.SafeString(str); };

  function formatTextForHTML(content, options) {
    // Start by escaping expressions in the content to make them safe.
    var safeContent = ESCAPE_EXPRESSION_FUNCTION(content);
    options = _.defaults(options || {}, {links: true, wrap: true});
    if (options.links) {
      safeContent = NS.Utils.linkify(safeContent);
      safeContent = NS.Utils.twitterify(safeContent);
    }
    if (options.wrap) {
      safeContent = NS.Utils.wrapify(safeContent);
    }
    return MARKSAFE_FUNCTION(safeContent); // Mark our string as safe, since it is.
  }

  Handlebars.registerHelper('formattext', formatTextForHTML);
  Handlebars.registerHelper('truncatechars', NS.Utils.truncateChars);

  Handlebars.registerHelper('TWEET_TEXT', getTweetText);
  Handlebars.registerHelper('SAFE_TWEET_TEXT', _.compose(formatTextForHTML, getTweetText));

  Handlebars.registerHelper('formattruncated', function(content, maxLength) {
    content = NS.Utils.truncateChars(content, maxLength);
    return formatTextForHTML(content, {links: false});
  });

  Handlebars.registerHelper('app_config', function(key, options) {
    var val = NS.appConfig[key];

    // If this is a block helper, treat it as such.
    if (!!options && ('fn' in options || 'inverse' in options)) {
      return (!!val) ? options.fn(val) : options.inverse(this);
    }

    // Otherwise, it's a normal helper; just insert the value.
    else {
      return val;
    }
  });

  Handlebars.registerHelper('current_user', function(key, options) {
    var val = NS.currentUserData[key];

    // If this is a block helper, treat it as such.
    if (!!options && ('fn' in options || 'inverse' in options)) {
      return (!!val) ? options.fn(val) : options.inverse(this);
    }

    // Otherwise, it's a normal helper; just insert the value.
    else {
      return val;
    }
  });

}(Hatch));
