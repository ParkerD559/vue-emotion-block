'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var htmlTags = _interopDefault(require('html-tags'));
var emotion = require('emotion');

/**
 * Render function for the functional wrapper.
 */
function render(createElement, context) {
    const emotionClass = emotion.cx(...this.$_styles.map(templateArg =>
        emotion.css.apply({ mergedProps: context.props }, templateArg)
    ));

    // add any preexisting classes
    const existingClasses = normalizeClasses(context.data);
    
    // Add the target class if need be
    const classes = this.$_targetClass
        ? [emotionClass, this.$_targetClass]
        : [emotionClass];

    return createElement(
        this.$_styledFrom,  // Base component even if styled multiple times
        { ...context.data, class: classes.concat(existingClasses) },
        context.children
    );
}

const makeWrapper = (allStyles, baseComponent) => {
    const wrapper = {
        functional: true,
        $_styles: allStyles,
        $_styledFrom: baseComponent,
        withComponent: makeWithComponent(allStyles),
    };
    // Bind the wrapper to render so it can always access $_styles
    // and $_styledFrom even if they are changed by subsequent stylings
    wrapper.render = render.bind(wrapper);
    return wrapper;
};

const makeWithComponent = (styles) => (tagOrComp) => makeWrapper(styles, tagOrComp);

/**
 * Make a new functional wrapper, used on basic html tags or non-styled components
 */
const newWrapper = (wrapped, templateArgs) => makeWrapper([templateArgs], wrapped);

/**
 * Merge existing styles into a new functional wrapper, used on styled components
 */
const mergeWrapper = (wrapped, templateArgs) => makeWrapper(
    [...wrapped.$_styles, templateArgs],
    wrapped.$_styledFrom
);

/**
 * If a component is a styled component
 */
const isStyled = component =>
    component.$_styles !== undefined &&
    component.$_styledFrom !== undefined;

/**
 * Normalize all possible class formats (string, object, array) to array format.
 */
const normalizeClasses = (vnodeData = {}) => {
  if (!vnodeData.class) return [];
  const classes = vnodeData.class;
  if (Array.isArray(classes)) {
    // join all classes into a single string, and then resplit to an array
    // because it could be a hybrid format like: ['class1 class 2', 'class 2'])
    return classes.join(' ').split(' ');
  }
  if (typeof classes === 'object') {
    return Object.entries(classes) // convert to [[class, boolean]] format
      .filter(([c, v]) => v) // filter to entries where object value is truthy
      .map(([c]) => c); // map to "class"
  }

  // otherwise it's just a string, so split at spaces and return as an array
  return classes.split(' ');
};

/**
 * Add a unique class or use the existing one
 */
const putTarget = component => {
    if (component.$_targetClass) {
        return `.${component.$_targetClass}`
    } else {
        const targetClass = `_${Math.random().toString(36).slice(2)}`;
        component.$_targetClass = targetClass;
        return `.${targetClass}`;
    }
};

/**
 * For any component passed as a style argument, add a unique class
 * and change the argument to the selector for that class.
 */
const transformTargets = templateArgs =>
    templateArgs.map(arg => {
        if (arg.render) {
            /* istanbul ignore else */
            if (isStyled(arg)) {
                return putTarget(arg);
            } else {
                if (process.env.NODE_ENV !== 'production') {
                    // eslint-disable-next-line no-console
                    console.error(`Only styled components are supported as selectors`);
                }
                return '';
            }
        }
        return arg;
    });

/**
 * Style the passed component.
 * @param {String|VueComponent} tagOrComp 
 */
const styled = tagOrComp => (...args) => {
    const templateArgs = transformTargets(args);
    return isStyled(tagOrComp)
    ? mergeWrapper(tagOrComp, templateArgs)
    : newWrapper(tagOrComp, templateArgs);
};

const styledHTML = (tag) => styled(tag);
htmlTags.forEach(tag => (styled[tag] = styledHTML(tag)));

module.exports = styled;
