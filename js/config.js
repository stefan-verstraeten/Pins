// Where your memories live. The app key comes from the Dropbox app created for Pins
// (dropbox.com/developers/apps). It is a public identifier, not a secret: sign-in uses
// OAuth with PKCE, so no secret ever ships with the app.
export const DROPBOX_APP_KEY = 'yn8092v95vuo9wc';

// The folder in Dropbox that holds pins.json and the photos. Share this folder between
// Stefan's and Marleen's Dropbox accounts so both phones read and write the same atlas.
export const DROPBOX_ROOT = '/Stefans Corner/Pins';
