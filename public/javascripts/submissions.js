// Submission workflow jQuery Plugin...
(function($,undefined){
  var methods = {
    init : function(options) {
      return this;
    },

    // Returns true if the input fields in a pane have a value
    allFieldsComplete : function(pane) {
      // This won't work in old IE versions <9.
      // If we need to support old IE add a conditional enhancement
      // to the start of the module...
      return this.find('input, select').toArray().every(function(element){ 
        return $(element).val(); 
      });
    },

    currentPane : function() {
      return this.closest('#orders > li');
    },

    markPaneIncomplete : function() {
      this.removeClass('completed');

      // Move this to an initialised callback
      $('#add-order').attr('disabled',true);

      return this;
    },

    markPaneInvalid : function() {
      return this.addClass('invalid');
    },

    markPaneComplete : function() {
      this.addClass('completed').
        removeClass('invalid').
        find('input, select');

      // Move this to an initialised callback
      this.find('.save-order, .cancel-order').hide();

      // Move this to an initialised callback
      $('#add-order').removeAttr('disabled');

      return this;
    }
  };


  $.fn.submission = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));

    } else if (typeof method === 'Object' || !method) {

      return methods.init.apply(this, arguments);
    } else {

      return $.error('Method ' +  method + ' does not exist on jQuery.submission');
    }
  };
})(jQuery);


// Submission page code...
(function($, undefined){
  // Name spacing stuff...
  if ( window.SCAPE === undefined) { window.SCAPE = {}; }

  if ( SCAPE.submission === undefined) { 
    SCAPE.submission = {
      order_params : {}
    };
  }


  var templateChangeHandler = function(event){
    var currentPane = $(event.target).submission('currentPane');

    // When there's nothing selected reset the parameters element and exit without 
    if ($(event.target).val() === "") {
      delete SCAPE.submission.template_id;
      $('#order-parameters').html('');
      return false;
    }

    SCAPE.submission.template_id = $(event.target).val();

    // Load the parameters for the new order
    $.get(
      '/submissions/order_parameters',
      { submission: SCAPE.submission },
      function(data) {
        $('#order-parameters').
          html(data);

        currentPane.submission('allFieldsComplete')?
          currentPane.submission('markPaneComplete') : currentPane.submission('markPaneIncomplete');

        $('#order-parameters').fadeIn();
      }
    );
    return true;
  };


  var studySelectHandler = function(event) {
  // This handler depends on the study template being set earlier in the wizard.
    var currentPane = $(event.target).submission('currentPane');

    currentPane.submission('markPaneIncomplete');

    SCAPE.submission.study_id = $(event.target).val();

    if ($(event.target).val().length > 0) {
      // Load asset groups for the selected study
      $.get(
        '/submissions/study_assets',
        { submission : SCAPE.submission },
        function(data) {
          currentPane.find('.study-assets').fadeOut(function(){
            $(this).html(data).fadeIn();
          });
        }
      );
      return true;
    } else {
      // The study selector has been reset so fade out and reset the field.
      currentPane.find('.study-assets').fadeOut(function(){
        $(this).html("");
      });

      return false;
    }

  };


  var saveOrderHandler = function(event) {
    var currentPane                 = $(this).submission('currentPane');
    var projectNameElement          = currentPane.find('.submission_project_name');
    SCAPE.submission.project_name   = projectNameElement.val();
    SCAPE.submission.asset_group_id = $('#submission_asset_group_id').val();

    $.post(
      '/submissions',
      { submission : SCAPE.submission },
      function(data) {

        // Ugly hack to load the order_valid flag before the returned
        // html is displayed.
        // Got to go....
        var tempResult = $('<div>').html(data);

        if(SCAPE.submission.order_valid) {
          currentPane.fadeOut(function(){
            //                                        vvvvvvvvvv-- Ugly, ugly, ugly...
            currentPane.find('.project-details').html(tempResult.html());

            currentPane.detach().removeClass('active invalid');

            currentPane.submission('markPaneComplete').
              find('input, select, textarea').not('.delete-order').
              attr('disabled',true);

            $('#order-controls').before(currentPane);
            currentPane.fadeIn();

            $('#blank-order').fadeIn();

            $('#submission_id').val(SCAPE.submission.id);
            $('#start-submission').removeAttr('disabled');

            $('.pane').not('#blank-order').addClass('active');

            // This temporarily limits the order to one per submission...
            $('#add-order').attr('disabled', true);
          });

        } else {
          currentPane.find('.project-details').html(data);
          currentPane.submission('markPaneInvalid');
        }
      }
    );
  };


  var validateOrderParams = function(event) {
    var currentPane = $(event.target).submission('currentPane');

    return currentPane.submission('allFieldsComplete')?
      currentPane.submission('markPaneComplete') : currentPane.submission('markPaneIncomplete');
  };


  var getParamName = function(param) {
    return $(param).attr('id').replace('submission_order_params_','');
  };

  var addOrderHandler = function(event) {
    // Loads this order's parameters into the SCAPE.submission object...
    $('#order-parameters').find('select, input').each(function(){
      SCAPE.submission.order_params[getParamName(this)] = $(this).val();
    });

    // Mask out the order template parameters so that they can't be
    // changed once an order has been added.
    $('#order-template').find('select, input').attr('disabled',true);


    $('.active').removeClass('active');

    // Stop the submission from being built until new the order is either
    // saved or cancelled...
    $('#start-submission').attr('disabled',true);

    $('#add-order').attr('disabled', true);

    var newOrder = $('<li>').
      html( $('#blank-order').html() ).
      addClass('pane active order').hide();

    // Remove the disable from the form inputs
    newOrder.find('input, select, textarea').
      removeAttr('disabled');

    newOrder.find('.submission_project_name').autocomplete({
      source    : SCAPE.user_project_names,
      minLength : 3
    });


    $('#blank-order').before(newOrder).fadeOut('fast',function(){
      newOrder.slideDown();
    });
  };

  var cancelOrderHandler = function(event) {
    var currentPane = $(event.target).submission('currentPane');

    currentPane.slideUp(function(){
      currentPane.remove();
      $('#blank-order').slideDown(function(){
        $('#add-order').removeAttr('disabled');
      });
    });
  };

  var deleteOrderHandler = function(event) {
    var currentPane = $(event.target).submission('currentPane');

     $.post(
       '/orders/' + currentPane.find('.order-id').val(),
       {
       _method : 'delete',
       id      : currentPane.find('.order-id').val()
       },
       function(response) {
         currentPane.slideUp(function(){
           currentPane.remove();
           $('#add-order').removeAttr('disabled');

           if ($('.order.completed').length === 0) {
             $('#start-submission').attr('disabled', true);
           }
         });
       });
  };


  // Document Ready stuff...
  $(function() {
    // Form reset stuff for Firefox...
    $('#start-submission').attr('disabled', true);

    $('#submission_template_id').
      val('Please select a template...').attr('selected', true).
      removeAttr('disabled').change(templateChangeHandler);

    $('#order-parameters .required').live('change',  validateOrderParams);

    $('#add-order').live('click', addOrderHandler);

    $('ul#orders').delegate('.study_id','change', studySelectHandler);

    $('ul#orders').delegate('.cancel-order', 'click', cancelOrderHandler);

    $('ul#orders').delegate('.save-order', 'click', saveOrderHandler);

    $('ul#orders').delegate('.delete-order', 'click', deleteOrderHandler);
  });

})(jQuery);
