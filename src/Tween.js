// @flow
import { default as React, Fragment } from 'react';
// $FlowFixMe
import { TweenMax as TweenClass } from 'gsap/TweenMax';
// $FlowFixMe
import 'gsap/TextPlugin';
import { TimelineContext } from './Timeline';
import { getTweenFunction, playStates, setPlayState, isEqual, refOrInnerRef } from './helper';
import PlugInSvgDraw from './plugins/PlugInSvgDraw';
PlugInSvgDraw();

// svg morphing
// https://github.com/veltman/flubber

TweenClass.lagSmoothing(0);

type TweenProps = {
  children?: Node,

  duration?: number,
  from?: any,
  to?: any,
  staggerFrom?: any,
  staggerTo?: any,
  stagger?: number,

  progress?: number,
  totalProgress?: number,
  playState?: string,

  [prop: string]: any,

}

class Tween extends React.Component<TweenProps, {}> {
  static displayName = 'Tween';

  static contextType = TimelineContext;

  static get playState() {
    return playStates;
  }

  targets: any[];
  tween: TweenClass;

  constructor(props: TweenProps) {
    super(props);

    this.targets = [];
  }

  componentDidMount() {
    this.tween = this.createTween();
  }

  componentWillUnmount() {
    if(this.tween) {
      this.tween.kill();
    }
  }

  getSnapshotBeforeUpdate() {
    this.targets = [];
    return null;
  }

  componentDidUpdate(prevProps: TweenProps) {
    const {
      children,

      duration,
      from,
      to,
      staggerFrom,
      staggerTo,
      stagger,

      progress,
      totalProgress,
      playState,

      onCompleteAll,
      onCompleteAllParams,
      onCompleteAllScope,
      onStartAll,

      disabled,

      ...vars
    } = this.props;

    // if children change create a new tween
    // TODO: replace easy length check with fast equal check
    if (React.Children.count(prevProps.children) !== React.Children.count(children)) {
      if (this.tween) {
        this.tween.kill();
      }
    
      this.tween = this.createTween();
    }

    if (disabled) {
      return;
    }

    // execute function calls
    if (progress !== prevProps.progress) {
      this.tween.progress(progress);
    }
    if (totalProgress !== prevProps.totalProgress) {
      this.tween.totalProgress(totalProgress);
    }
    if (duration !== prevProps.duration) {
      this.tween.duration(duration);
    }
    // if "to" or "staggerTo" props are changed: reinit and restart tween
    if (!isEqual(to, prevProps.to)) {
      this.tween.vars = { ...to, ...vars };
      this.tween.invalidate();
      if (!this.tween.paused()) {
        this.tween.restart();
      }
    }
    if (!isEqual(staggerTo, prevProps.staggerTo)) {
      let delay = 0;
      this.tween.getChildren(false, true, false).forEach((tween) => {
        tween.vars = { ...staggerTo, ...vars, ...{ delay } };
        tween.invalidate();
        delay += stagger;
      });
      if (!this.tween.paused()) {
        this.tween.restart(true);
      }
    }

    setPlayState(playState, prevProps.playState, this.tween);
  }

  createTween() {
    const {
      position,
      align,
      stagger,
      ...vars
    } = this.props;

    let tween;

    if (this.context && this.context.length !== 0){
      const [timeline, timelineTargets] = this.context;
      if(this.targets.length === 0) {
        
        tween = getTweenFunction(timelineTargets, { stagger, ...vars });
      }  else {
        tween = getTweenFunction(this.targets, { stagger, ...vars }); 
      }
      console.log("Adding tween to context timeline: " + tween);
      timeline.add(tween, position || '+=0', align || 'normal', stagger || 0);
    } else {
      if(this.target.length === 0) {
        tween = getTweenFunction([], { stagger, ...vars });
        console.warn("Creating a tween without target. Did you forget to put the tween in a timeline oder adding a reffable child inside the tween?");
      } else {
        tween = getTweenFunction(this.targets, this.props);
      }
    }
    
    return tween;
  }


  addTarget(target: any) {
    // target is null at unmount
    if (target !== null) {
      this.targets.push(target);
    }
  }

  render() {
    return (
      <Fragment>
        {React.Children.map(this.props.children, child =>
          React.cloneElement(
            child,
            {
              [refOrInnerRef(child)]: (target) => this.addTarget(target)
            }
          )
        )}
      </Fragment>
    );
  }
}

export { Tween };
