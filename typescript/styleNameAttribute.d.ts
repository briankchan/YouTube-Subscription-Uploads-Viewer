// make this a module so it can augment react
export default this;

// add styleName attribute for css modules
declare module "react" {
	interface HTMLAttributes<T> {
		styleName?: string;
	}
}
