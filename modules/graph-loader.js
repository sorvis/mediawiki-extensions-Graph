( function ( $, mw ) {

	mw.hook( 'wikipage.content' ).add( function () {

		// Make graph containers clickable
		$( '#bodyContent' ).on( 'click', '.mw-graph.mw-graph-interactable', function () {
			var $this = $( this ),
				$button = $this.find( '.mw-graph-switch' );

			// Prevent multiple clicks
			$this.off( 'click' );

			// Add a class to decorate loading
			$button.hide()
				.html( '' )
				.addClass( 'mw-graph-loading' )
				.show();

			// Replace the image with the graph
			loadAndReplaceWithGraph( $this );
		} );

		/**
		 * Replace a graph image by the vega graph.
		 *
		 * If dependencies aren't loaded yet, they are loaded first
		 * before rendering the graph.
		 *
		 * @param {jQuery} $el Graph container.
		 */
		function loadAndReplaceWithGraph( $el ) {
			// TODO, Performance BUG: loading vega and calling api should happen in parallel
			// Lazy loading dependencies
			mw.loader.using( 'ext.graph.vega2', function () {
				new mw.Api().get( {
					formatversion: 2,
					action: 'graph',
					title: mw.config.get( 'wgPageName' ),
					hash: $el.data( 'graphId' )
				} ).done( function ( data ) {
					mw.drawVegaGraph( $el[ 0 ], data.graph, function ( error ) {
						var $layover = $el.find( '.mw-graph-layover' );
						if ( !error ) {
							$el.find( 'img' ).remove();
							$layover.remove();
						} else {
							mw.log.warn( error );
						}
						// TODO: handle error by showing some message
					} );
				} );
			} );
		}

	} );

}( jQuery, mediaWiki ) );
