/*globals Backbone Handlebars $ _ Countable Event Swiper */

var Hatch = Hatch || {};

(function(NS) {
  // Handlebars support for Marionette
  Backbone.Marionette.TemplateCache.prototype.compileTemplate = function(rawTemplate) {
    return Handlebars.compile(rawTemplate);
  };

  // Base mixins
  NS.SupportHandlerMixin = {
    handleSupport: function(evt) {
      evt.preventDefault();
      var vision = this.model,
          supporters = vision.get('supporters'),
          user = NS.app.currentUser,
          category = NS.getCategory(vision.get('category')),
          supportCount = category.get('support_count'),
          visionFromMainCollection, index;

      if (NS.app.currentUser.isAuthenticated() && category.get('active')) {
        // supporters is an array of ids in some cases, a collection (with
        // contains) in others.
        if (_.isArray(supporters)){
          // if supported, unsupport
          index = _.indexOf(supporters, user.id);
          visionFromMainCollection = NS.app.visionCollections[category.get('name')].get(this.model.id);

          if(index > -1) {
            NS.Utils.log('send', 'event', 'vision-support', 'remove', this.model.id);

            user.unsupport(visionFromMainCollection);
            // Update counts on the home page
            category.set('support_count', supportCount-1);

            // Remove from the supporters array for rendering
            supporters.splice(index, 1);

            this.$('.support').removeClass('supported');
          } else {
            NS.Utils.log('send', 'event', 'vision-support', 'add', this.model.id);

            user.support(visionFromMainCollection);
            // Update counts on the home page
            category.set('support_count', supportCount+1);

            supporters.push(user.id);
            this.$('.support').addClass('supported');
          }
        } else {
          if(supporters.contains && supporters.contains(user)) {
            NS.Utils.log('send', 'event', 'vision-support', 'remove', this.model.id);

            user.unsupport(vision);
            // Update counts on the home page
            category.set('support_count', supportCount-1);
            this.$('.support').removeClass('supported');
          } else {
            NS.Utils.log('send', 'event', 'vision-support', 'add', this.model.id);

            user.support(vision);
            // Update counts on the home page
            category.set('support_count', supportCount+1);
            this.$('.support').addClass('supported');
          }
        }

        this.updateSupportCount();
      }
    },
    updateSupportCount: function() {
      this.$('.total-support-count').html(this.totalSupportString());
    },
    totalSupportString: function() {
      var count = this.model.get('supporters').length,
          countString;

      if (count >= 1000000) {
        countString = (Math.floor(count/100000))/10 + 'M';
      }
      else if (count >= 100000) {
        countString = Math.floor(count/100000) + 'K';
      }
      else if (count >= 1000) {
        countString = (Math.floor(count/100))/10 + 'K';
      }
      else {
        countString = count.toString();
      }

      return countString;
    }
  };

  NS.OrderedCollectionMixin = {
    // https://github.com/marionettejs/backbone.marionette/wiki/Adding-support-for-sorted-collections
    // Inspired by the above link, but it doesn't work when you start with an
    // empty (or unsorted) list.
    appendHtml: function(collectionView, itemView, index){
      var childrenContainer = collectionView.itemViewContainer ? collectionView.$(collectionView.itemViewContainer) : collectionView.$el,
          children = childrenContainer.children(),
          indices = childrenContainer.data('indices') || [],
          sortNumber = function(a,b) { return a - b; },
          goHereIndex;
      // console.log(index, $(itemView.el).find('.feed-item-title').text());

      // console.log('before', indices);
      indices.push(index);
      indices.sort(sortNumber);
      // console.log('after', indices);
      goHereIndex = indices.indexOf(index);
      // console.log('at', goHereIndex);

      if(goHereIndex === 0) {
        childrenContainer.prepend(itemView.el);
        // console.log('prepend');
      } else {
        // console.log('insert after', childrenContainer.children().eq(goHereIndex-1).find('.feed-item-title').text());
        childrenContainer.children().eq(goHereIndex-1).after(itemView.el);
      }

      childrenContainer.data('indices', indices);
    }
  };

  NS.PaginatedCompositeView = Backbone.Marionette.CompositeView.extend({
    // template: '#paginated-list-tpl',
    // itemViewContainer: '.content-list',
    events: {
      'click .load-more-action': 'onClickLoadMore'
    },

    collectionEvents: {
      add: function() {
        this.setLoadButtonVisibility(this.collection.hasNextPage());
      },
      reset: function() {
        this.setLoadButtonVisibility(this.collection.hasNextPage());
      }
    },

    onRender: function() {
      this.setLoadButtonVisibility(this.collection.hasNextPage());
    },

    onClickLoadMore: function(evt) {
      evt.preventDefault();
      this.loadMoreContentItems();
    },

    loadMoreContentItems: function() {
      var self = this;
      this.collection.fetchNextPage(function(collection, response, options) {
        self.setLoadButtonVisibility(collection.hasNextPage());
      });
    },

    setLoadButtonVisibility: function(show) {
      this.$('.load-more-action').toggleClass('is-hidden', !show);
    }
  });

  // Views ====================================================================
  NS.HomeView = Backbone.Marionette.Layout.extend({
    template: '#home-tpl',
    regions: {
      category: '.category-region',
      visionaries: '.visionaries-region',
      allies: '.allies-region',
      visions: '.visions-region'
    }
  });

  NS.HomeCategoryView = Backbone.Marionette.ItemView.extend({
    template: '#home-category-tpl',
    modelEvents: {
      'change': 'onChange'
    },
    onChange: function() {
      this.render();
    }
  });

  NS.AllySignupView = Backbone.Marionette.ItemView.extend({
    template: '#ally-signup-tpl',
    tagName: 'p'
  });

  // Vision List ==============================================================
  NS.VisionListItemView = Backbone.Marionette.ItemView.extend({
    template: '#list-item-tpl',
    tagName: 'li',
    events: {
      'click .support-link': 'handleSupport'
    },
    templateHelpers: function(){
      var modelIndex = this.model.collection.indexOf(this.model);
      return {
        index: modelIndex,
        show_add_button: modelIndex % 4 === 0
      };
    },
    handleSupport: NS.SupportHandlerMixin.handleSupport,
    updateSupportCount: NS.SupportHandlerMixin.updateSupportCount,
    totalSupportString: NS.SupportHandlerMixin.totalSupportString
  });

  NS.VisionListView = NS.PaginatedCompositeView.extend({
    template: '#list-tpl',
    itemView: NS.VisionListItemView,
    itemViewContainer: 'ul.vision-list'
  });

  // Replies ==================================================================
  NS.NoRepliesView = Backbone.Marionette.ItemView.extend({
    template: '#no-replies-tpl',
    tagName: 'li'
  });

  NS.ReplyView = Backbone.Marionette.ItemView.extend({
    template: '#reply-item-tpl',
    tagName: 'li'
  });

  NS.ReplyListView = Backbone.Marionette.CompositeView.extend({
    template: '#reply-list-tpl',
    itemView: NS.ReplyView,
    itemViewContainer: 'ul.replies-list',
    emptyView: NS.NoRepliesView,
    events: {
      'click .show-reply': 'showReplyForm',
      'submit form.reply-form': 'handleFormSubmission'
    },
    onRender: function() {
      var self = this,
          $countLabel = this.$('.reply-count'),
          $replyForm = this.$('.reply-form'),
          $submitBtn = this.$('.reply-btn'),
          max = 132;

      this.$replyArea = this.$('.reply-text');
      this.initialReply = this.$replyArea.val();

      if (this.$replyArea.length) {
        Countable.live(this.$replyArea.get(0), function (counter) {
          self.chars = counter.all;
          self.charsLeft = max - counter.all;
          $countLabel.html(self.charsLeft);

          if (self.chars > 0 && self.chars <= max && self.$replyArea.val() != self.initialReply) {
            $submitBtn.prop('disabled', false);
          } else {
            $submitBtn.prop('disabled', true);
          }

          if (self.charsLeft < 0) {
            $replyForm.removeClass('warning').addClass('error');
          } else if (self.charsLeft < 20) {
            $replyForm.removeClass('error').addClass('warning');
          } else {
            $replyForm.removeClass('warning error');
          }
        });
      }
    },
    showReplyForm: function(evt) {
      evt.preventDefault();

      NS.Utils.log('send', 'event', 'vision-reply', 'new', this.model.id);

      var $form = this.$('.reply-form').show(),
          $field = $form.find(':input[type!=hidden]:first'),
          val = $field.val();

      $field.focus().val('').val(val);
    },
    handleFormSubmission: function(evt) {

      NS.Utils.log('send', 'event', 'vision-reply', 'save', this.model.id);

      evt.preventDefault();
      var form = evt.target,
          data = NS.Utils.serializeObject(form),
          reply = data.attrs,
          category = NS.getCategory(this.model.get('category')),
          replyCount = category.get('reply_count');

      reply.author = NS.app.currentUser.get('id');
      reply.author_details = NS.app.currentUser.toJSON();

      // Set the tweeted at time to right now, so that we can render the reply
      // right away, without waiting on a response from Twitter.
      reply.tweeted_at = (new Date()).toISOString();

      if (this.charsLeft >= 0 && this.chars > 0) {
        // Save the reply
        this.collection.create(reply);
        // Update the counts on the home page
        category.set('reply_count', replyCount+1);

        // Reset the form
        form.reset();

        // Really force the counter to reset
        if ('oninput' in document) {
          // This is because jQuery doens't support input for some reason
          this.$replyArea.get(0).dispatchEvent(new Event('input'));
        } else {
          this.$replyArea.trigger('keyup');
        }
      }
    }
  });

  NS.NoReplyToVisionItemView = Backbone.Marionette.ItemView.extend({
    template: '#no-reply-to-vision-items-tpl',
    tagName: 'li'
  });

  NS.ReplyToVisionItemView = Backbone.Marionette.ItemView.extend({
    template: '#reply-to-vision-tpl',
    tagName: 'li'
  });

  NS.ReplyToVisionListView = Backbone.Marionette.CollectionView.extend({
    template: '#reply-to-vision-tpl',
    tagName: 'ul',
    className: 'unstyled-list vision-list',
    itemView: NS.ReplyToVisionItemView,
    emptyView: NS.NoReplyToVisionItemView
  });


  // Avatars ==================================================================
  NS.UserAvatarView = Backbone.Marionette.ItemView.extend({
    template: '#user-avatar-tpl',
    tagName: 'li'
  });

  NS.UserAvatarListView = Backbone.Marionette.CompositeView.extend({
    itemView: NS.UserAvatarView,
    itemViewContainer: 'ul.user-list',
    appendHtml: NS.OrderedCollectionMixin.appendHtml
  });

  // Support ==================================================================
  NS.SupportListView = Backbone.Marionette.CompositeView.extend({
    template: '#support-list-tpl',
    itemView: NS.UserAvatarView,
    itemViewContainer: 'ul.user-list',

    collectionEvents: {
      "add": "collectionChanged",
      "remove": "collectionChanged",
      "reset": "collectionChanged"
    },

    collectionChanged: function() {
      this.renderSummary();
    },

    renderSummary: function() {
      var html = Handlebars.templates['support-summary-tpl'](this.model.toJSON());
      this.$('.support-summary').html(html);
    }
  });

  // Vision Details ===========================================================
  NS.VisionDetailLayout = Backbone.Marionette.Layout.extend({
    template: '#item-tpl',
    regions: {
      replies: '.replies-region',
      support: '.support-region'
    },
    events: {
      'click .show-reply': 'showReplyForm',
      'click .support-link': 'handleSupport',
      'click .retweet-link': 'handleRetweet',
      'click .twitter-link': 'handleTwitter',
      'click .confirm-retweet-action': 'handleConfirmRetweet',
      'click .cancel-retweet-action': 'handleCancelRetweet',
      'click .vision-media-container': 'handleVisionMediaClick'
    },
    handleSupport: NS.SupportHandlerMixin.handleSupport,
    updateSupportCount: NS.SupportHandlerMixin.updateSupportCount,
    totalSupportString: NS.SupportHandlerMixin.totalSupportString,
    showReplyForm: function(evt) {
      evt.preventDefault();

      if (NS.app.currentUser.isAuthenticated()) {
        this.regionManager.get('replies').currentView.showReplyForm(evt);
      } else {
        this.$('.support-login-prompt').addClass('is-hidden');
      }
    },
    handleTwitter: function(evt) {
      NS.Utils.log('send', 'event', 'vision', 'view-in-twitter', this.model.id);
    },
    handleRetweet: function(evt) {
      evt.preventDefault();
      var vision = this.model,
          sharers = vision.get('sharers'),
          user = NS.app.currentUser,
          alreadyShared = user.isAuthenticated() && _.contains(sharers, user.id);

      if (!user.isAuthenticated() || !alreadyShared) {
        NS.Utils.log('send', 'event', 'vision-retweet', 'start', this.model.id);
      }

      if (user.isAuthenticated() && !alreadyShared) {
        this.$('.confirm-retweet-prompt').removeClass('is-hidden');
      } else {
        this.$('.support-login-prompt').addClass('is-hidden');
      }
    },
    handleConfirmRetweet: function(evt) {
      evt.preventDefault();
      var vision = this.model,
          sharers = vision.get('sharers'),
          user = NS.app.currentUser;

      if (!_.contains(sharers, user.id)) {

        NS.Utils.log('send', 'event', 'vision-retweet', 'confirm', this.model.id);

        user.share(vision);
        this.$('.retweet-link').addClass('retweeted');
        this.$('.support').addClass('supported');
        this.updateSupportCount();
      }

      this.$('.confirm-retweet-prompt').addClass('is-hidden');
    },
    handleCancelRetweet: function(evt) {
      evt.preventDefault();

      NS.Utils.log('send', 'event', 'vision-retweet', 'cancel', this.model.id);

      this.$('.confirm-retweet-prompt').addClass('is-hidden');
    },
    handleVisionMediaClick: function(evt) {
      evt.preventDefault();
      this.$('.vision-media-container').toggleClass('is-collapsed');
    }
  });

  // Vision Form ==============================================================
  NS.VisionFormView = Backbone.Marionette.ItemView.extend({
    template: '#form-tpl',
    events: {
      'submit form': 'handleFormSubmission',
      'change .vision-media input': 'handleMediaFileChange'
    },
    ui: {
      file: 'input[type=file]',
      imagePreview: '.image-preview',
      submit: 'input[type=submit]'
    },
    getFirstInvalidElement: function(form) {
      var invalidEl = null,
          $form = $(form);

      // For each form element
      $form.find('input, select, textarea').each(function(i, el) {
        if (el.validity && el.validity.valid === false) {
          invalidEl = el;
          return false;
        }
      });

      return invalidEl;
    },
    handleFormSubmission: function(evt) {
      evt.preventDefault();
      var form = evt.currentTarget,
          invalidEl = this.getFirstInvalidElement(form);

      if (invalidEl) {

        NS.Utils.log('send', 'event', 'vision', 'save', 'invalid');

        $(invalidEl).focus();
        invalidEl.select();
      } else {
        this.saveForm(form);
      }
    },
    saveForm: function(form) {
      var self = this,
          data = NS.Utils.serializeObject(form),
          category = NS.getCategory(this.model.get('category')),
          visionCount = category.get('vision_count');

      // Disable the submit button until we get a response
      this.ui.submit.prop('disabled', true);

      this.model.set(data.attrs, {silent: true});
      this.collection.add(this.model);
      this.model.save(null, {
        wait: true,
        headers: data.headers,
        error: function() {

          NS.Utils.log('send', 'event', 'vision', 'save', 'fail');

          self.ui.submit.prop('disabled', false);
          window.alert('Unable to save your vision. Please try again.');
        },
        success: function(model) {

          var tweetFlag = (this.$('.vision-tweet input').is(':checked') ? 1 : 0);
          NS.Utils.log('send', 'event', 'vision', 'save', 'success', tweetFlag);

          // Set the count on the home page
          category.set('vision_count', visionCount+1);
          NS.app.router.navigate('/'+NS.appConfig.vision_plural+'/' + model.get('category') + '/' + model.id, {trigger: true});
        }
      });

    },
    handleMediaFileChange: function(evt) {
      var self = this,
          file,
          attachment;

      if(evt.target.files && evt.target.files.length) {
        file = evt.target.files[0];

        // Is it an image?
        if (file.type.indexOf('image') !== 0) {
          window.alert('Sorry, we only support images.');
          this.ui.file.val('');
          return;
        }

        NS.Utils.fileToCanvas(file, function(canvas) {
          canvas.toBlob(function(blob) {

            NS.Utils.log('send', 'event', 'vision', 'add-image');

            self.model.set('media', blob);
            var previewUrl = canvas.toDataURL('image/jpeg');
            self.ui.imagePreview.attr('src', previewUrl).removeClass('is-hidden');
          }, 'image/jpeg');
        }, {
          // TODO: make configurable
          maxWidth: 800,
          maxHeight: 800,
          canvas: true
        });
      }
    }
  });

  // Users ====================================================================
  NS.UserListLayout = Backbone.Marionette.Layout.extend({
    template: '#user-list-tpl',
    regions: {
      userList: '.user-list-region'
    }
  });

  NS.UserListItemView = Backbone.Marionette.ItemView.extend({
    template: '#user-list-item-tpl',
    tagName: 'li'
  });

  NS.UserListView = Backbone.Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'vision-list unstyled-list',
    itemView: NS.VisionListItemView,
    emptyView: NS.NoItemsView
  });

  NS.UserListWithFilterView = NS.PaginatedCompositeView.extend({
    template: '#user-page-tpl',
    itemViewContainer: 'ul.filtered-user-list',

    // tagName: 'ul',
    // className: 'unstyled-list',
    itemView: NS.UserListItemView
  });

  NS.UserDetailView = Backbone.Marionette.Layout.extend({
    template: '#user-detail-tpl',
    regions: {
      content: '.content-region'
    },
    showVisions: function() {
      this.$('.tab').removeClass('is-current');
      this.$('a[href*="'+ NS.appConfig.vision_plural +'"]').parent('.tab').addClass('is-current');
      this.content.show(new NS.UserListView({
        collection: new NS.VisionCollection(this.model.get('visions'))
      }));
    },
    showSupported: function() {
      this.$('.tab').removeClass('is-current');
      this.$('a[href*="supported"]').parent('.tab').addClass('is-current');
      this.content.show(new NS.UserListView({
        collection: new Backbone.Collection(this.model.get('supported'))
      }));
    },
    showReplies: function() {
      this.$('.tab').removeClass('is-current');
      this.$('a[href*="replies"]').parent('.tab').addClass('is-current');
      this.content.show(new NS.ReplyToVisionListView({
        // NOTE: see comments in the UserModel for an explanation as to why
        // this is differnt than visions and supported regions.
        collection: new Backbone.Collection(this.model.get('replies'))
      }));
    }
  });

  NS.NotificationItemView = Backbone.Marionette.ItemView.extend({
    template: '#notification-list-item-tpl',
    tagName: 'li'
  });

  NS.NotificationEmptyView = Backbone.Marionette.ItemView.extend({
    template: '#notification-list-empty-tpl',
    tagName: 'li'
  });

  NS.NotificationListView = Backbone.Marionette.CompositeView.extend({
    template: '#notification-list-tpl',
    itemViewContainer: 'ul',
    itemView: NS.NotificationItemView,
    emptyView: NS.NotificationEmptyView
  });

  NS.WalkthroughView = Backbone.Marionette.ItemView.extend({
    template: '#walkthrough-tpl',
    className: 'overlay-content',
    events: {
      'click .btn-close': 'close'
    },
    onShow: function() {
      var self = this;

      $('body').addClass('walkthrough');

      // It is important for this everything to be in the DOM for swiper to
      // be a happy little plugin.
      self.swiper = new Swiper(this.$('.swiper-container').get(0), {
        pagination: this.$('.pagination').get(0),
        paginationClickable: true,
        grabCursor: true
      });

      self.$('.pagination-btn-prev').click(function(evt) {
        evt.preventDefault();
        self.swiper.swipePrev();
      });

      self.$('.pagination-btn-next').click(function(evt) {
        evt.preventDefault();
        self.swiper.swipeNext();
      });
    },
    onClose: function() {
      $('body').removeClass('walkthrough');
    }
  });

}(Hatch));