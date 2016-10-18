import React, { Component, PropTypes } from "react";
import css from "react-css-modules";
import styles from "./view.css";
import Header from "./components/header";
import Navigation from "./components/navigation";

@css(styles)
export default class View extends Component<any, {}> {
	static propTypes = {
		children: PropTypes.node.isRequired
	};
	
	render() {
		return (
				<div>
					<Header />
					<Navigation />
					<div styleName="wrap">
						{ this.props.children }
					</div>
				</div>
		);
	}
}
