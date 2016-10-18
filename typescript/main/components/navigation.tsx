import React, { Component } from "react";
import css from "react-css-modules";
import styles from "./navigation.css";

@css(styles)
export default class Navigation extends Component<any, void> {
	render() {
		return (
				<div id="nav">
					<ul id="subscriptions">
						<li class="channel" ng-click="select()">
							<div class="channelUnwatched">{{getUnwatchedCount()}}</div>
							<div class="channelLabel">
								<img src="" class="channelThumb">
									<span class="channelName">Subscriptions</span>
							</div>
						</li>
						<Link class="channel" ng-repeat="channel in subscriptions | orderBy:getChannelName" ng-click="select(channel)">
							<div class="channelUnwatched">{{getUnwatchedCount(channel)}}</div>
							<div class="channelLabel">
								<img ng-src="{{getChannelThumb(channel)}}" class="channelThumb">
									<span class="channelName">{{getChannelName(channel)}}</span>
							</div>
						</Link>
					</ul>
				</div>
		)
	}
}
