//----------------------------
// --- Event Utils 
//----------------------------

module.exports = {
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
	}
};
