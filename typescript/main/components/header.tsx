import React, { Component } from "react";
import css from "react-css-modules";
import styles from "./header.css";

@css(styles)
export default class Header extends Component<any, void> {
	render() {
		return (
				<div styleName="header">
					<button id="reload-extension-button">Reload Extension</button>
					<button id="refreshButton">Refresh Videos</button>
					<div id="login">
						<button id="authorizeButton">Log In</button>
					</div>
					<div id="channelControls">
						<button id="markAllWatched">Mark all watched</button>
					</div>
				</div>
		)
	}
}
