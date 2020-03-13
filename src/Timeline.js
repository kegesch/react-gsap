// @flow
import { default as React, createContext, Ref } from 'react';
// $FlowFixMe
import { TimelineMax as TimelineClass } from 'gsap/TweenMax';
import { getTweenFunction, playStates, setPlayState, refOrInnerRef } from './helper';

type TimelineProps = {
  children: Node,
  target?: any,

  duration?: number,
  progress?: number,
  totalProgress?: number,
  playState?: string,
  [prop: string]: any,
}

type TimelineTweenContext = {
  timeline: TimelineClass, 
  timelineTargets: any[],
}

export const TimelineContext = React.createContext<TimelineTweenContext>([]);

class Timeline extends React.Component<TimelineProps, {}> {
  static displayName = 'Timeline';
  
  static contextType = TimelineContext;

  static get playState() {
    return playStates;
  }

  timeline: TimelineClass;
  targets: any[];

  constructor(props: TimelineProps) {
    super(props);
    
    this.targets = [];
    this.timeline = this.createTimeline();
  }

  componentWillUnmount() {
    if(this.timeline) {
      this.timeline.kill();
    }
  }

  getSnapshotBeforeUpdate() {
    this.targets = [];
    return null;
  }

  componentDidUpdate(prevProps: TimelineProps) {
    const {
      duration,
      progress,
      totalProgress,
      playState,
    } = this.props;

    // execute function calls
    if (progress !== prevProps.progress) {
      this.timeline.progress(progress);
    }
    if (totalProgress !== prevProps.totalProgress) {
      this.timeline.totalProgress(totalProgress);
    }
    if (duration !== prevProps.duration) {
      this.timeline.duration(duration);
    }
    
    setPlayState(playState, prevProps.playState, this.timeline);
  }

  createTimeline() {
    const {
      children,
      target,
      duration,
      progress,
      totalProgress,
      playState,
      ...vars
    } = this.props;

    
    // init timeline
    const timeline = new TimelineClass({
      smoothChildTiming: true,
      ...vars,
    });

    if (this.context && this.context.length !== 0 && this.context[0]) {
      const [parentTimeline, timelineTarget] = this.context;
      // we are in another timeline
      const {
        position,
        align,
        stagger,
      } = this.props;

      parentTimeline.add(timeline, position || '+=0', align || 'normal', stagger || '0');
    }

    if (duration) {
      timeline.duration(duration);
    }
    return timeline;
  }

  addTarget(target: any) {
    // target is null at unmount
    if (target !== null) {
      this.targets.push(target);
    }
  }

  cloneElement(child: any) {
    return React.cloneElement(
      child,
      {
        // $FlowFixMe
        [refOrInnerRef(child)]: (target) => this.addTarget(target)
      }
    );
  }

  render() {
    let { target, children } = this.props;

    let renderTargets = React.Children.map(target, child => {
      if (child.type.toString() === 'Symbol(react.fragment)') {
        return React.Children.map(child.props.children, fragmentChild => {
          return this.cloneElement(fragmentChild);
        });
      }
      return this.cloneElement(child);
    });

    let targets = this.targets;
    if (this.targets.length === 0) {
      if(this.context && this.context.length !== 0) {
        const [timeline, timelineTargets] = this.context;
        targets = timelineTargets;
      } 
    }

    return (
      <TimelineContext.Provider value={[this.timeline, targets]}>
        {/* First render the target */}
        {renderTargets}
        {children}
      </TimelineContext.Provider>
    );
  }
}

export { Timeline };
