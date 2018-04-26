//----------------------------
// --- Event Utils 
//----------------------------

module.exports = {
	SUBSCRIBER_QUEUE_PREFIX : "SUBS_",
	
	checkEventType : function( event ) {
	    return !( !event.eventType);
	},

	checkEventDate : function( event ) {
	    if (!event.eventDate ) {
	    	return false;
	    }
	    try {
	    	var date = new Date(event.eventDate);
	    	return (event.eventDate === date.getTime());
	    } catch(err) {
	    	return false;
	    }
	    
	},

	isEvent : function( event ) {
	  return ( module.exports.checkEventType(event) && module.exports.checkEventDate(event));
	},

	stringify: function( event ) {
		return JSON.stringfy( event );
	},

	getOriginal: function( event ) {
		if( module.exports.isEvent( event ) ) {
			return event;
		} 
		if( event.Message ) {
			return module.exports.getOriginal( JSON.parse( event.Message ));
		}
		if( event.Body ) {
			return module.exports.getOriginal( JSON.parse( event.Body ));
		}
		return null;
	},

	getPayload : function( event ) {
		event = module.exports.getOriginal(event);
		if(event) {
			return event.payload;
		}
		return null;
	}
};
